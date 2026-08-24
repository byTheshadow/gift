/* =========================================================
   Echoes for 夜寒
   Content Data
   ========================================================= */

window.ECHO_DATA = {
  maxSelections: 3,

  /*
    最终表白文字：
    空字符串 "" 会被 app.js 识别为停顿，不显示文字。
  */
  confessionLines: [
    "宇宙里有无数频率，",
    "",
    "它们穿过黑暗，",
    "穿过沉默，",
    "穿过无人知晓的漫长轨道。",
    "",
    "有的成为星光，",
    "有的消散成回声。",
    "",
    "而我曾以为，",
    "所有旋律终究只是短暂相遇，",
    "所有心跳都会归于静音。",
    "",
    "直到我听见你。",
    "",
    "像一颗星穿过无边夜色，",
    "像一个音符，",
    "恰好落在我生命最安静的那一拍。",
    "",
    "于是无序开始拥有和声，",
    "寂静开始拥有名字，",
    "而我也终于明白——",
    "",
    "原来我一直在等待的，",
    "不是一段旋律的开始。",
    "",
    "是你。"
  ],

  signature: "TO. 夜寒",

  /*
    三个真正收集的信物。

    icon 是内联 SVG，不使用 Emoji 或外部图片。
    每一根线条都会继承 CSS 中的 currentColor，
    所以后续统一调整黑白风格会很方便。
  */
  artifacts: {
    rest: {
      id: "rest",
      archiveNumber: "ARCHIVE // 01",
      title: "休止符",
      englishTitle: "THE REST",
      description:
        "在遇见你之前，世界是一场漫长的停顿。所有尚未开始的旋律，都在等待你落下第一拍。",

      icon: `
        <svg viewBox="0 0 160 160" role="img" aria-label="休止符">
          <circle cx="80" cy="80" r="65" opacity="0.14"></circle>
          <path d="M46 49h68"></path>
          <path d="M54 49v34"></path>
          <path d="M106 49v34"></path>
          <path d="M54 68h52"></path>
          <path d="M65 83v17c0 12 8 20 19 20s19-8 19-20V83"></path>
          <path d="M65 101h38"></path>
          <path d="M73 111c2 8 7 12 11 12s9-4 11-12"></path>
          <circle cx="80" cy="80" r="3" fill="currentColor" stroke="none"></circle>
        </svg>
      `
    },

    tuningFork: {
      id: "tuningFork",
      archiveNumber: "ARCHIVE // 02",
      title: "音叉",
      englishTitle: "THE TUNING FORK",
      description:
        "世间万物都在以不同的频率振动。而我穿过那些喧嚣，只听见你的回声，与我的心跳恰好重合。",

      icon: `
        <svg viewBox="0 0 160 160" role="img" aria-label="音叉">
          <circle cx="80" cy="80" r="65" opacity="0.14"></circle>
          <path d="M56 42v38c0 16 10 28 24 28s24-12 24-28V42"></path>
          <path d="M56 42v14"></path>
          <path d="M104 42v14"></path>
          <path d="M80 108v21"></path>
          <path d="M68 129h24"></path>
          <path d="M48 62c-10 11-10 25 0 36" opacity="0.5"></path>
          <path d="M112 62c10 11 10 25 0 36" opacity="0.5"></path>
          <path d="M39 53c-17 17-17 37 0 54" opacity="0.22"></path>
          <path d="M121 53c17 17 17 37 0 54" opacity="0.22"></path>
          <circle cx="80" cy="108" r="3" fill="currentColor" stroke="none"></circle>
        </svg>
      `
    },

    record: {
      id: "record",
      archiveNumber: "ARCHIVE // 03",
      title: "星际唱片",
      englishTitle: "THE RECORD",
      description:
        "我想把风吹过的时刻、未说出口的名字，还有每一次靠近时的心跳，一并刻录进宇宙永不磨损的轨道。",

      icon: `
        <svg viewBox="0 0 160 160" role="img" aria-label="星际唱片">
          <circle cx="80" cy="80" r="56"></circle>
          <circle cx="80" cy="80" r="43" opacity="0.45"></circle>
          <circle cx="80" cy="80" r="30" opacity="0.35"></circle>
          <circle cx="80" cy="80" r="14"></circle>
          <circle cx="80" cy="80" r="3" fill="currentColor" stroke="none"></circle>
          <path d="M115 42l17-17"></path>
          <path d="M123 34h9v9"></path>
          <path d="M126 72c10 3 17 10 20 20" opacity="0.35"></path>
          <path d="M34 103c-9-8-14-18-14-30" opacity="0.22"></path>
        </svg>
      `
    }
  },

  /*
    六个可滑动的盲盒。

    artifactId 对应上面 artifacts 内的 ID。
    六个盲盒分别映射三个信物，各出现两次。
    因此玩家无论选择哪三个，都将触发三种不同信物：
    具体的“去重分配”逻辑将在 app.js 中处理。
  */
  blindBoxes: [
    {
      id: "box-01",
      number: "SIGNAL // 01",
      title: "无声小节",
      initialHint: "一段停在起拍之前的空白。",
      openingHint: "检测到未落下的第一拍……",
      artifactId: "rest",
      icon: `
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M20 36h60"></path>
          <path d="M28 36v29"></path>
          <path d="M72 36v29"></path>
          <path d="M28 53h44"></path>
          <path d="M38 65v9c0 8 5 13 12 13s12-5 12-13v-9"></path>
          <circle cx="50" cy="52" r="2" fill="currentColor" stroke="none"></circle>
        </svg>
      `
    },
    {
      id: "box-02",
      number: "SIGNAL // 02",
      title: "失焦回声",
      initialHint: "有一种声音，来自很远的地方。",
      openingHint: "频率逐渐靠近，回声正在聚焦……",
      artifactId: "tuningFork",
      icon: `
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="10"></circle>
          <circle cx="50" cy="50" r="22" opacity="0.55"></circle>
          <circle cx="50" cy="50" r="35" opacity="0.25"></circle>
          <path d="M50 15v9"></path>
          <path d="M50 76v9"></path>
          <path d="M15 50h9"></path>
          <path d="M76 50h9"></path>
        </svg>
      `
    },
    {
      id: "box-03",
      number: "SIGNAL // 03",
      title: "轨道余温",
      initialHint: "一条尚未被命名的时间轨道。",
      openingHint: "正在读取一段未被磨损的记录……",
      artifactId: "record",
      icon: `
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="31"></circle>
          <circle cx="50" cy="50" r="21" opacity="0.5"></circle>
          <circle cx="50" cy="50" r="10"></circle>
          <circle cx="50" cy="50" r="2.5" fill="currentColor" stroke="none"></circle>
          <path d="M72 28l13-13"></path>
        </svg>
      `
    },
    {
      id: "box-04",
      number: "SIGNAL // 04",
      title: "静音指针",
      initialHint: "它指向的地方，没有噪音。",
      openingHint: "静音层正在剥离，留下纯净共振……",
      artifactId: "rest",
      icon: `
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 16v49"></path>
          <path d="M32 65h36"></path>
          <path d="M39 65v9c0 7 5 11 11 11s11-4 11-11v-9"></path>
          <path d="M21 25l58 58" opacity="0.35"></path>
          <circle cx="50" cy="16" r="3" fill="currentColor" stroke="none"></circle>
        </svg>
      `
    },
    {
      id: "box-05",
      number: "SIGNAL // 05",
      title: "共振边界",
      initialHint: "两种频率在这里短暂重合。",
      openingHint: "边界消失，正在校准同一段心跳……",
      artifactId: "tuningFork",
      icon: `
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M37 24v26c0 11 5 19 13 19s13-8 13-19V24"></path>
          <path d="M50 69v17"></path>
          <path d="M41 86h18"></path>
          <path d="M27 35c-10 9-10 21 0 30" opacity="0.4"></path>
          <path d="M73 35c10 9 10 21 0 30" opacity="0.4"></path>
          <circle cx="50" cy="69" r="2.5" fill="currentColor" stroke="none"></circle>
        </svg>
      `
    },
    {
      id: "box-06",
      number: "SIGNAL // 06",
      title: "远方刻痕",
      initialHint: "像一封寄往深空、迟到的信。",
      openingHint: "轨道正在转动，旧日声纹被重新唤醒……",
      artifactId: "record",
      icon: `
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <ellipse cx="50" cy="50" rx="34" ry="24"></ellipse>
          <ellipse cx="50" cy="50" rx="23" ry="16" opacity="0.5"></ellipse>
          <ellipse cx="50" cy="50" rx="11" ry="7"></ellipse>
          <circle cx="50" cy="50" r="2.5" fill="currentColor" stroke="none"></circle>
          <path d="M22 74c10 9 20 13 28 13" opacity="0.3"></path>
        </svg>
      `
    }
  ]
};
