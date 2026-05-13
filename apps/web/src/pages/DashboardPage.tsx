import { useParams } from "react-router-dom";

import { getMe } from "../api/auth";
import { useAuth } from "../components/authState";
import { Exobot } from "../components/Exobot";
import type { UserRole } from "../api/types";

const roleLabels: Record<UserRole, string> = {
  admin: "管理员",
  teacher: "老师",
  student: "学生",
};

const roleNotes: Record<UserRole, string> = {
  admin: "这里以后会放班级和账号管理。",
  teacher: "这里以后会放课堂和练习任务。",
  student: "这里以后会放你的练习和小外记录。",
};

export function DashboardPage() {
  const { role } = useParams();
  const { token, user, updateUser, signOut } = useAuth();
  const shownRole = user?.role ?? (role as UserRole);
  const displayName = user?.display_name ?? user?.username ?? "小伙伴";

  async function refreshUser() {
    if (token === null) {
      return;
    }

    const freshUser = await getMe(token);
    updateUser(freshUser);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100 p-5 text-ink">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col rounded-kid bg-white/85 p-6 shadow-kid sm:p-8">
        <header className="flex flex-col gap-4 border-b-4 border-sky-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-sky-600">ExoKids</p>
            <h1 className="mt-2 text-3xl font-black sm:text-5xl">你好，{displayName}</h1>
          </div>
          <button
            className="min-h-12 rounded-button bg-slate-100 px-5 text-base font-black text-slate-700 transition hover:bg-slate-200"
            onClick={signOut}
            type="button"
          >
            退出
          </button>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex justify-center">
            <Exobot mood="proud" className="scale-110" />
          </div>

          <div className="space-y-5">
            <div className="rounded-kid border-4 border-green-200 bg-green-50 p-6">
              <p className="text-lg font-black text-green-700">当前角色</p>
              <p className="mt-2 text-4xl font-black">{roleLabels[shownRole]}</p>
            </div>

            <div className="rounded-kid border-4 border-amber-200 bg-amber-50 p-6">
              <h2 className="text-2xl font-black">今天的空白小桌面</h2>
              <p className="mt-3 text-lg font-semibold text-slate-600">{roleNotes[shownRole]}</p>
            </div>

            <button
              className="min-h-12 rounded-button bg-skyday px-5 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-sky-500"
              onClick={refreshUser}
              type="button"
            >
              刷新小档案
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
