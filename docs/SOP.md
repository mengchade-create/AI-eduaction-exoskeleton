# 每日协作 SOP

## 早上：说"开工"

Codex 自动执行：
1. python ops/daily.py start
2. 从 main 拉 NEXT.md 指定的分支
3. 贴 git log --oneline -3 证明起点干净
4. 按 NEXT.md 开始干活

## 晚上：说"收工"

Codex 自动执行：
1. python ops/daily.py end
2. 交互回答三个问题：
   - 今天合并了哪些 PR？（编号）
   - 明天做哪个 PR？（默认：下一个 pending）
   - 今天做了什么？（一句话）
3. 自动更新计划文档状态、生成 NEXT.md、写 TODAY.md、commit、push
4. 回复"晚安"

## 特殊指令

- "收工，明天做 PR<N>" → 跳过"明天做哪个"的询问，直接用 PR<N>
- "收工，跳过明日任务" → 不生成 NEXT.md
- "规划 Phase <N>" → Codex 根据上一 Phase 结果起草 docs/phase-<N>-plan.md
- "看进度" → python ops/daily.py plan
