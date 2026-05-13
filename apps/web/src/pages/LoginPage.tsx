import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../api/auth";
import { useAuth } from "../components/authState";
import { Exobot } from "../components/Exobot";

const avatarOptions = ["太阳", "星星", "彩虹"];

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const result = await login(username.trim(), password);
      signIn(result.access_token, result.user);
      navigate(`/dashboard/${result.user.role}`);
    } catch {
      setMessage("小外没有认出来，请检查名字和密码后再试一次。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-amber-50 to-green-100 p-5 text-ink">
      <section className="grid w-full max-w-5xl items-center gap-8 rounded-kid bg-white/80 p-6 shadow-kid backdrop-blur sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col items-center text-center">
          <Exobot mood="hello" />
          <h1 className="mt-5 text-3xl font-black sm:text-5xl">欢迎来到 ExoKids</h1>
          <p className="mt-4 max-w-sm text-lg font-semibold text-slate-600">
            和小外一起开始今天的探索。
          </p>
        </div>

        <form
          className="rounded-kid border-4 border-sky-200 bg-cloud p-5 shadow-lg sm:p-7"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-black sm:text-3xl">登录</h2>
            <p className="text-base font-semibold text-slate-600">输入你的名字和密码就可以出发。</p>
          </div>

          <label className="mt-6 block text-lg font-bold" htmlFor="username">
            名字
          </label>
          <input
            className="mt-2 min-h-12 w-full rounded-button border-3 border-sky-200 bg-white px-4 text-lg font-semibold outline-none ring-sky-400 transition focus:ring-4"
            id="username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="比如 xingxing"
            required
            type="text"
            value={username}
          />

          <label className="mt-5 block text-lg font-bold" htmlFor="password">
            密码
          </label>
          <input
            className="mt-2 min-h-12 w-full rounded-button border-3 border-sky-200 bg-white px-4 text-lg font-semibold outline-none ring-sky-400 transition focus:ring-4"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="输入密码"
            required
            type="password"
            value={password}
          />

          <fieldset className="mt-6">
            <legend className="text-lg font-bold">学生头像</legend>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {avatarOptions.map((option) => (
                <label
                  className={`flex min-h-12 cursor-pointer items-center justify-center rounded-button border-3 px-3 text-base font-black transition ${
                    avatar === option
                      ? "border-berry bg-rose-100 text-rose-700"
                      : "border-sky-200 bg-white text-slate-600"
                  }`}
                  key={option}
                >
                  <input
                    checked={avatar === option}
                    className="sr-only"
                    name="avatar"
                    onChange={() => setAvatar(option)}
                    type="radio"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          {message && (
            <p className="mt-5 rounded-button bg-rose-100 px-4 py-3 text-base font-bold text-rose-700">
              {message}
            </p>
          )}

          <button
            className="mt-6 min-h-12 w-full rounded-button bg-ink px-5 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "小外正在看..." : "开始"}
          </button>
        </form>
      </section>
    </main>
  );
}
