"""Default development seed data for ExoKids.

Run with:
    python -m app.seeds.default_seed
"""

from __future__ import annotations

import os

import bcrypt
from sqlmodel import Session, select

from app.db.session import engine
from app.models import Assignment, Class, ClassMember, Device, User


DEFAULT_PASSWORD = os.getenv("EXOKIDS_SEED_PASSWORD", "change-me-please-seed-password")


def hash_password(password: str) -> str:
    """Return a bcrypt hash for a seed password."""

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def get_or_create_user(
    session: Session,
    *,
    username: str,
    role: str,
    display_name: str,
    avatar: str,
) -> User:
    """Return an existing user by username or create it."""

    existing = session.exec(select(User).where(User.username == username)).first()
    if existing is not None:
        return existing

    user = User(
        username=username,
        password_hash=hash_password(DEFAULT_PASSWORD),
        role=role,
        display_name=display_name,
        avatar=avatar,
    )
    session.add(user)
    session.flush()
    return user


def get_or_create_class(session: Session, *, name: str, teacher: User) -> Class:
    """Return an existing class by name and teacher or create it."""

    existing = session.exec(
        select(Class).where(Class.name == name, Class.teacher_id == teacher.id)
    ).first()
    if existing is not None:
        return existing

    classroom = Class(name=name, teacher_id=teacher.id)
    session.add(classroom)
    session.flush()
    return classroom


def ensure_class_member(session: Session, *, classroom: Class, student: User) -> None:
    """Ensure a student belongs to a class."""

    existing = session.exec(
        select(ClassMember).where(
            ClassMember.class_id == classroom.id,
            ClassMember.student_id == student.id,
        )
    ).first()
    if existing is not None:
        return

    session.add(ClassMember(class_id=classroom.id, student_id=student.id))
    session.flush()


def get_or_create_assignment(session: Session, *, classroom: Class) -> Assignment:
    """Return the demo assignment or create it."""

    existing = session.exec(
        select(Assignment).where(
            Assignment.class_id == classroom.id,
            Assignment.title == "认识左右髋关节",
        )
    ).first()
    if existing is not None:
        return existing

    assignment = Assignment(
        class_id=classroom.id,
        title="认识左右髋关节",
        description="观察小外外左右髋关节的数据变化。",
        template_code=(
            "import exo\n\n"
            "await exo.connect()\n"
            "angles = await exo.get_joint_angles()\n"
            "exo.log(f'左髋: {angles.left_hip:.1f}°，右髋: {angles.right_hip:.1f}°')\n"
        ),
    )
    session.add(assignment)
    session.flush()
    return assignment


def get_or_create_device(session: Session) -> Device:
    """Return the simulated robot device or create it."""

    existing = session.exec(select(Device).where(Device.name == "模拟机器人")).first()
    if existing is not None:
        return existing

    device = Device(
        name="模拟机器人",
        pi_host="simulated.local",
        pi_user="exokids",
        ssh_key_ref="dev-simulated",
        online=False,
    )
    session.add(device)
    session.flush()
    return device


def seed(session: Session) -> None:
    """Seed the default users, class, demo assignment, and simulated device."""

    admin = get_or_create_user(
        session,
        username="admin",
        role="admin",
        display_name="管理员",
        avatar="robot",
    )
    teacher = get_or_create_user(
        session,
        username="teacher01",
        role="teacher",
        display_name="老师一号",
        avatar="teacher",
    )
    student = get_or_create_user(
        session,
        username="xingxing",
        role="student",
        display_name="星星同学",
        avatar="star",
    )
    classroom = get_or_create_class(session, name="外骨骼启蒙班", teacher=teacher)
    ensure_class_member(session, classroom=classroom, student=student)
    get_or_create_assignment(session, classroom=classroom)
    get_or_create_device(session)
    session.commit()

    print("Seed complete:")
    print(f"- admin: {admin.username}")
    print(f"- teacher: {teacher.username}")
    print(f"- student: {student.username}")
    print(f"- default password source: EXOKIDS_SEED_PASSWORD or development placeholder")


def main() -> None:
    """Run the default seed script."""

    with Session(engine) as session:
        seed(session)


if __name__ == "__main__":
    main()
