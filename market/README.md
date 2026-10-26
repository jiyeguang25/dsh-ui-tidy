# market/index.json

插件市场索引（format 1）。在 DSH 里加为自定义索引源：

```
https://raw.githubusercontent.com/jiyeguang25/dsh-ui-tidy/main/market/index.json
```

`versions[].source.type = "npm"` 表示从 npm 安装 `dsh-ui-tidy@0.2.0`；
若某天只发 GitHub Release 不发 npm，把该字段改成
`{ "type": "github", "url": "https://github.com/jiyeguang25/dsh-ui-tidy" }` 即可。
