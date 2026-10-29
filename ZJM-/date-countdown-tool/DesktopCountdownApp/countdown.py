#!/usr/bin/env python3
import json
import os
import tkinter as tk
from datetime import datetime


CONFIG_PATH = os.path.expanduser("~/Library/Application Support/DateCountdownWidget/config.json")


class DateCountdownWidget:
    def __init__(self, root):
        self.root = root
        self.root.title("日期倒计时")
        self.root.geometry("420x360")
        self.root.minsize(360, 320)
        self.root.configure(bg="#f3efe7")
        self.root.attributes("-topmost", True)

        self.drag_start = None
        self.editing = False

        self.title_var = tk.StringVar(value="距离目标日")
        self.note_var = tk.StringVar(value="愿你稳稳抵达")
        self.date_var = tk.StringVar(value="2026-12-31")
        self.time_var = tk.StringVar(value="00:00")
        self.topmost_var = tk.BooleanVar(value=True)

        self._load_config()
        self._build_ui()
        self._tick()

    def _load_config(self):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as file:
                config = json.load(file)
        except (FileNotFoundError, json.JSONDecodeError):
            return

        self.title_var.set(str(config.get("title", self.title_var.get()))[:30])
        self.note_var.set(str(config.get("note", self.note_var.get()))[:60])
        self.date_var.set(str(config.get("date", self.date_var.get()))[:10])
        self.time_var.set(str(config.get("time", self.time_var.get()))[:5])
        self.topmost_var.set(bool(config.get("topmost", True)))

    def _save_config(self):
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        config = {
            "title": self.title_var.get().strip() or "距离目标日",
            "note": self.note_var.get().strip(),
            "date": self.date_var.get().strip(),
            "time": self.time_var.get().strip() or "00:00",
            "topmost": self.topmost_var.get(),
        }
        with open(CONFIG_PATH, "w", encoding="utf-8") as file:
            json.dump(config, file, ensure_ascii=False, indent=2)

    def _build_ui(self):
        self.shell = tk.Frame(self.root, bg="#f3efe7", padx=22, pady=18)
        self.shell.pack(fill="both", expand=True)
        self.shell.bind("<ButtonPress-1>", self._start_drag)
        self.shell.bind("<B1-Motion>", self._drag)

        header = tk.Frame(self.shell, bg="#f3efe7")
        header.pack(fill="x")

        self.title_label = tk.Label(
            header,
            textvariable=self.title_var,
            bg="#f3efe7",
            fg="#232323",
            font=("Helvetica Neue", 22, "bold"),
            anchor="w",
        )
        self.title_label.pack(side="left", fill="x", expand=True)
        self.title_label.bind("<ButtonPress-1>", self._start_drag)
        self.title_label.bind("<B1-Motion>", self._drag)

        self.pin_button = self._small_button(header, "置顶", self._toggle_topmost)
        self.pin_button.pack(side="right", padx=(8, 0))

        self.edit_button = self._small_button(header, "编辑", self._toggle_edit)
        self.edit_button.pack(side="right", padx=(8, 0))

        self.display = tk.Frame(self.shell, bg="#f3efe7")
        self.display.pack(fill="both", expand=True, pady=(24, 0))
        self.display.bind("<ButtonPress-1>", self._start_drag)
        self.display.bind("<B1-Motion>", self._drag)

        days_row = tk.Frame(self.display, bg="#f3efe7")
        days_row.pack(anchor="center")

        self.days_label = tk.Label(
            days_row,
            text="0",
            bg="#f3efe7",
            fg="#151515",
            font=("Menlo", 92, "bold"),
        )
        self.days_label.pack(side="left")

        tk.Label(
            days_row,
            text="天",
            bg="#f3efe7",
            fg="#151515",
            font=("Helvetica Neue", 28, "bold"),
        ).pack(side="left", padx=(8, 0), pady=(34, 0))

        self.detail_label = tk.Label(
            self.display,
            text="",
            bg="#f3efe7",
            fg="#5e5a52",
            font=("Menlo", 18, "bold"),
        )
        self.detail_label.pack(pady=(6, 0))

        self.note_label = tk.Label(
            self.display,
            textvariable=self.note_var,
            bg="#f3efe7",
            fg="#7d7568",
            font=("Helvetica Neue", 14),
            wraplength=340,
            justify="center",
        )
        self.note_label.pack(pady=(20, 0))

        self.edit_panel = tk.Frame(self.shell, bg="#e7dfd1", padx=14, pady=12)

        self._field(self.edit_panel, "标题", self.title_var)
        self._field(self.edit_panel, "文案", self.note_var)
        self._field(self.edit_panel, "日期", self.date_var, hint="YYYY-MM-DD")
        self._field(self.edit_panel, "时间", self.time_var, hint="HH:MM")

        actions = tk.Frame(self.edit_panel, bg="#e7dfd1")
        actions.pack(fill="x", pady=(10, 0))

        self._action_button(actions, "保存", self._save_and_close).pack(side="left", fill="x", expand=True, ipady=7)
        self._action_button(actions, "今天", self._set_today).pack(side="left", padx=(8, 0), ipady=7)
        self._action_button(actions, "年底", self._set_year_end).pack(side="left", padx=(8, 0), ipady=7)

        self.root.bind("<Command-e>", lambda _event: self._toggle_edit())
        self.root.bind("<Escape>", lambda _event: self._close_edit())

    def _field(self, parent, label, variable, hint=""):
        row = tk.Frame(parent, bg="#e7dfd1")
        row.pack(fill="x", pady=4)

        tk.Label(
            row,
            text=label,
            width=5,
            anchor="w",
            bg="#e7dfd1",
            fg="#6f675a",
            font=("Helvetica Neue", 12, "bold"),
        ).pack(side="left")

        entry = tk.Entry(
            row,
            textvariable=variable,
            bg="#fffaf0",
            fg="#1e1e1e",
            insertbackground="#1e1e1e",
            relief="flat",
            font=("Helvetica Neue", 13),
        )
        entry.pack(side="left", fill="x", expand=True, ipady=6)

        if hint:
            tk.Label(
                row,
                text=hint,
                bg="#e7dfd1",
                fg="#9b9181",
                font=("Menlo", 10),
            ).pack(side="left", padx=(8, 0))

        entry.bind("<Return>", lambda _event: self._save_and_close())
        return entry

    def _small_button(self, parent, text, command):
        return tk.Button(
            parent,
            text=text,
            command=command,
            bg="#211f1b",
            fg="#fffaf0",
            activebackground="#3a342b",
            activeforeground="#fffaf0",
            relief="flat",
            bd=0,
            cursor="pointinghand",
            font=("Helvetica Neue", 11, "bold"),
        )

    def _action_button(self, parent, text, command):
        return tk.Button(
            parent,
            text=text,
            command=command,
            bg="#211f1b",
            fg="#fffaf0",
            activebackground="#3a342b",
            activeforeground="#fffaf0",
            relief="flat",
            bd=0,
            cursor="pointinghand",
            font=("Helvetica Neue", 12, "bold"),
        )

    def _target_datetime(self):
        raw_date = self.date_var.get().strip()
        raw_time = self.time_var.get().strip() or "00:00"
        for fmt in ("%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M", "%Y.%m.%d %H:%M"):
            try:
                return datetime.strptime(f"{raw_date} {raw_time}", fmt)
            except ValueError:
                continue
        return None

    def _tick(self):
        target = self._target_datetime()
        now = datetime.now()

        if target is None:
            self.days_label.configure(text="--")
            self.detail_label.configure(text="日期格式不对")
        else:
            seconds = int((target - now).total_seconds())
            is_past = seconds < 0
            seconds_abs = abs(seconds)
            days = seconds_abs // 86400
            hours = (seconds_abs % 86400) // 3600
            minutes = (seconds_abs % 3600) // 60
            secs = seconds_abs % 60

            self.days_label.configure(text=str(days))
            if is_past:
                self.detail_label.configure(text=f"已经过去 {hours:02d}:{minutes:02d}:{secs:02d}")
            else:
                self.detail_label.configure(text=f"还剩 {hours:02d}:{minutes:02d}:{secs:02d}")

        self.pin_button.configure(text="已置顶" if self.topmost_var.get() else "置顶")
        self.root.attributes("-topmost", self.topmost_var.get())
        self.root.after(1000, self._tick)

    def _toggle_edit(self):
        if self.editing:
            self._save_and_close()
        else:
            self.editing = True
            self.display.pack_forget()
            self.edit_panel.pack(fill="x", pady=(22, 0))
            self.edit_button.configure(text="完成")
            self.root.geometry("420x360")

    def _close_edit(self):
        if not self.editing:
            return
        self.editing = False
        self.edit_panel.pack_forget()
        self.display.pack(fill="both", expand=True, pady=(24, 0))
        self.edit_button.configure(text="编辑")

    def _save_and_close(self):
        self._save_config()
        self._close_edit()

    def _toggle_topmost(self):
        self.topmost_var.set(not self.topmost_var.get())
        self._save_config()

    def _set_today(self):
        now = datetime.now()
        self.date_var.set(now.strftime("%Y-%m-%d"))
        self.time_var.set(now.strftime("%H:%M"))

    def _set_year_end(self):
        now = datetime.now()
        self.date_var.set(f"{now.year}-12-31")
        self.time_var.set("00:00")

    def _start_drag(self, event):
        self.drag_start = (event.x_root, event.y_root, self.root.winfo_x(), self.root.winfo_y())

    def _drag(self, event):
        if not self.drag_start:
            return
        start_x, start_y, window_x, window_y = self.drag_start
        self.root.geometry(f"+{window_x + event.x_root - start_x}+{window_y + event.y_root - start_y}")


if __name__ == "__main__":
    root = tk.Tk()
    DateCountdownWidget(root)
    root.mainloop()
