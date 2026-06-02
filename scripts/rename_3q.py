from pathlib import Path

SRC_DIR = r"C:\Users\Administrator\trading-command-center\assets\char_3q"

NAME_MAP = {
    "emo_1": "emo_idle",
    "emo_2": "emo_passionate",
    "emo_3": "emo_combat",
    "emo_4": "emo_excited",
    "emo_5": "emo_humor",
    "emo_6": "emo_sincere",
    "emo_7": "emo_resilient",
    "emo_8": "emo_angry",
    "emo_9": "emo_speech",
}

src = Path(SRC_DIR)
for old_stem, new_stem in NAME_MAP.items():
    for ext in [".png", ".jpg", ".jpeg"]:
        old_path = src / f"{old_stem}{ext}"
        new_path = src / f"{new_stem}{ext}"
        if old_path.exists():
            old_path.rename(new_path)
            print(f"OK  {old_path.name} → {new_path.name}")
        else:
            print(f"--  {old_path.name} 不存在，跳過")
