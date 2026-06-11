with open("app/services/bot.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(185, 588): # 186 to 588 (0-indexed)
    lines[i] = "    " + lines[i]

with open("app/services/bot.py", "w", encoding="utf-8") as f:
    f.writelines(lines)
