export function getChromeDevtoolsHtml(targetPort: number) {
  return `<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <title>DevTools Targets</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 2em;
    }

    ul {
      padding: 0;
    }

    li {
      margin-bottom: 1.2em;
      list-style: none;
      line-height: 1.5;
    }

    a.button {
      display: inline-block;
      background: #409eff;
      color: #fff;
      padding: 0.2em 0.5em;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 0.5em;
      font-size: 14px;
    }

    a.button:hover {
      background: #66b1ff;
    }

    #refresh {
      margin-bottom: 1.5em;
    }
  </style>
</head>

<body>
  <h2>可用 DevTools Targets</h2><button id="refresh">刷新</button>
  <ul id="target-list">
    <li>加载中...</li>
  </ul>
  <script>
    async function fetchTargets() {
      const list = document.getElementById("target-list");
      list.innerHTML = "<li>加载中...</li>";
      try {
        const resp = await fetch("/__chii_proxy/targets");
        const data = await resp.json();
        const targets = data.targets || [];
        if (targets.length === 0) {
          list.innerHTML = "<li>暂无可用的调试目标。</li>";
        } else {
          list.innerHTML = "";
          for (const target of targets) {
            console.log(target)
            const devToolsUrl = "http://localhost:${targetPort}/front_end/chii_app.html?ws=localhost:${targetPort}/client/" + Math.random().toString(20).substring(2, 8) + "?target=" + encodeURIComponent(target.id) + "&rtc=false";
            const item = document.createElement("li");
            item.innerHTML =
              "<div><strong>" + (target.title) + "</strong></div>" +
              "<div>URL: " + (target.url || "") + "</div>" +
              "<div>UA: <code>" + (target.userAgent || "unknown") + "</code></div>" +
              "<a href='" + devToolsUrl + "' target='_blank' class='button'>打开调试</a>";
            list.appendChild(item);
          }
        }
      } catch (e) {
        list.innerHTML = "<li>获取调试目标失败</li>";
      }
    }
    document.getElementById("refresh").onclick = () => window.location.reload();
    window.onload = fetchTargets;
    document.addEventListener('visibilitychange', window.location.reload);
  </script>
</body>

</html>`;
}
