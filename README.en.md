<div align="center">

<img src="icon.png" alt="Abner" width="120" height="120" />

# 🖐️ Abner Extension

### A modern Persian new tab — all your daily tools in one place

🇺🇸 **English** | 🇮🇷 [فارسی](./README.md)

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/MortezaAbner/ChromeExtensions)
[![Version](https://img.shields.io/badge/version-1.8.0-2563eb?style=for-the-badge)](https://github.com/MortezaAbner/ChromeExtensions/releases)
[![License](https://img.shields.io/badge/License-PolyForm%20Noncommercial-orange?style=for-the-badge)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://MortezaAbner.github.io/ChromeExtensions)

[![Made with ❤️ in Iran](https://img.shields.io/badge/Made%20with%20%E2%9D%A4%EF%B8%8F%20in-Iran-22c55e?style=flat-square)](https://github.com/MortezaAbner)
[![Persian](https://img.shields.io/badge/Language-فارسی-blue?style=flat-square)](https://github.com/MortezaAbner)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/MortezaAbner/ChromeExtensions/pulls)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🗓 Persian Calendar
- Full Jalali, Hijri and Gregorian calendar
- 90+ Iranian, Islamic and international events
- Official holidays highlighted in red
- Unlimited date converter
- Beautiful glass monthly view

### ⏰ Clock & Date
- Live Persian clock
- Jalali, Gregorian and Hijri dates
- Weekday display
- Prayer times with live sun and moon arc

### 🌦 Weather
- 6-day forecast
- Various conditions (sunny, rainy, snowy, thunderstorm)
- Location detection via GPS and IP
- Search across 47 popular cities

</td>
<td width="50%">

### ✅ Tasks & Notes
- Task management with priority and labels
- Quick notes
- Google Tasks sync
- Auto-save

### 🔗 Bookmarks
- Smart folder organization
- 6 customizable folders
- "Abner Extension" quick access button
- Auto site icons

### ⏱ Timer
- Timer with typing and mouse wheel support
- Auto-save
- Audio alert at the end
- Resumes after browser restart

### 🔍 Smart Search
- Support for 13 search engines
- Persian engines: Zarebin, Gerdoo, Parsast
- Voice and image search
- Glass dropdown

</td>
</tr>
</table>

---

## 👨‍💻 About the Project

<div align="center">

> *"Abner started with a simple idea: why shouldn't the new tab page look like a clean, beautiful desk?"*

</div>

Abner is a **personal open-source project** built with modern design, modular architecture, and new development tools — made for Persian-speaking users.

### 🎯 Project Philosophy

- **🇮🇷 Full localization** — Jalali calendar, prayer times, Persian search engines
- **🎨 Modern design** — Glassmorphism with full blur and opacity control
- **🔐 Privacy first** — Data stored in the user's own Google account
- **📱 Multi-platform** — Chrome extension + PWA on all devices
- **🆓 Completely free** — No ads, no subscriptions

### 🛠 Development Approach

This project began with **personal ideation and design** and used **modern development tools (including AI)** as a technical assistant during the build. Every feature was designed, tested and reviewed before being shipped.

> 💡 *Like an architect who uses AutoCAD to design a beautiful building — the tool doesn't replace creativity and vision.*

### 🎁 Final Goal

To build a **useful, beautiful, and free tool** for all Persian speakers worldwide — so they don't waste their time and focus in the noisy internet world.

---

## 🎨 Themes

<table>
<tr>
<td align="center">✨<br /><b>Glass</b><br />Aurora Glass</td>
<td align="center">🌙<br /><b>Dark</b><br />Dark</td>
<td align="center">☀️<br /><b>Light</b><br />Light</td>
</tr>
</table>

- 🎚️ **Blur and opacity control** for all elements
- 🎨 **Aurora glass background** in glass mode
- 🔄 **Quick switch** with a single click on the theme icon

---

## 🔐 Sign-in & Sync

<div align="center">

| Mode | Storage | Sync |
|:---:|:---:|:---:|
| 🚪 **Guest** | Local | ❌ |
| 🔑 **Google** | Local + Drive | ✅ |

</div>

- ✅ **Secure sign-in with Google OAuth 2.0**
- ✅ **Data stored in Google Drive AppData** (private secure folder)
- ✅ **No intermediary server — fully secure**
- ✅ **Works completely offline**
- ✅ **Automatic sync across all devices**

---

## 🚀 Installation

### From Chrome Web Store
```
🔜 Coming soon
```

### Manual Install (Developer Mode)

```bash
# 1. Clone the latest version
git clone https://github.com/MortezaAbner/ChromeExtensions.git
```

Then in Chrome:
```
1. Go to chrome://extensions
2. Enable Developer Mode (top right)
3. Click Load unpacked
4. Select the project folder
```

### PWA Install
```
1. Open https://MortezaAbner.github.io/ChromeExtensions
2. Browser menu → Add to Home Screen
```

---

## 🛠 Tech Stack

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Chrome](https://img.shields.io/badge/Manifest-V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)

</div>

- 🧩 **Modular architecture** — each feature is an independent module
- 🎨 **Glassmorphism** — modern glass design
- 🔌 **APIs used:**
  - Open-Meteo (weather)
  - Nominatim (city search)
  - Aladhan (prayer times)
  - Google Drive / Tasks / Calendar

---

## 📊 Project Structure

```
ChromeExtensions/
├── 📄 manifest.json
├── 📄 index.html
├── 📄 style.css
├── 📄 app.js
└── 📁 modules/
    ├── 🎨 glass/         # Glass engine
    ├── ⏰ clock/         # Clock & date
    ├── 📅 calendar/      # Persian calendar + converter
    ├── 🌦 weather/       # Weather
    ├── 🕌 prayer/        # Prayer times
    ├── ⏱ timer/         # Timer
    ├── ✅ tasks/         # Tasks & notes
    ├── 🔗 bookmarks/     # Bookmarks
    ├── 🔍 search/        # Search bar
    ├── 🎛 dock/          # Bottom dock
    ├── 🔑 auth/          # Google auth
    └── ☁️ sync/          # Cloud sync
```

---

## 🤝 Contributing

All forms of contribution are welcome!

- 🐛 **Found a bug?** [Open an issue](https://github.com/MortezaAbner/ChromeExtensions/issues)
- 💡 **Have an idea?** [Start a discussion](https://github.com/MortezaAbner/ChromeExtensions/discussions)
- 🔧 **Want to code?** Send a Pull Request

---

## 📜 License

<div align="center">

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial-orange?style=for-the-badge)](LICENSE)

</div>

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

### Summary

| Usage | Allowed? |
|---|:---:|
| 🏠 Personal use | ✅ |
| 🎓 Educational use | ✅ |
| 🔬 Research | ✅ |
| 🎨 Hobby projects | ✅ |
| 🏢 Non-commercial organizations | ✅ |
| ✏️ Modifying code | ✅ |
| 📤 Redistribution (with attribution) | ✅ |
| 💰 **Selling** | ❌ |
| 💼 **Commercial use** | ❌ |

> ⚠️ **Note:** This is **not** an OSI-approved open-source license. Commercial use requires a separate license from the author.

For full terms, see the [LICENSE](./LICENSE) file.

### 📧 Commercial Use

If you'd like to use this project in a commercial product, please reach out via [GitHub](https://github.com/MortezaAbner).

---

<div align="center">

### ⭐ If you like Abner, give it a star!

Made with ❤️ by [Morteza Abner](https://github.com/MortezaAbner)

[![GitHub followers](https://img.shields.io/github/followers/MortezaAbner?style=social)](https://github.com/MortezaAbner)
[![GitHub stars](https://img.shields.io/github/stars/MortezaAbner/ChromeExtensions?style=social)](https://github.com/MortezaAbner/ChromeExtensions)

</div>
