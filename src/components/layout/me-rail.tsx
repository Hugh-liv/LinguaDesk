export function MeRail() {
  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">本地优先 · Local</p>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          没有账号、没有同步、没有排行榜。材料、练习和写作都留在这台设备。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          AI 只在需要时读取当前文本；Key 始终在服务端。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">数据位置</p>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          项目文件放在 <span className="font-mono text-[10.5px]">D:\LinguaDesk</span>。
          学习数据由浏览器保存在 IndexedDB，具体目录由浏览器配置决定。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          在设置页导出备份时，可以选择保存到 D 盘；恢复也使用同一个 JSON。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">一种节奏</p>
        <p className="mt-2.5 font-display text-[16px] leading-7 text-foreground/85">
          把工具调顺，
          <br />
          然后把时间还给学习。
        </p>
        <p className="mt-3 text-[10px] text-muted-foreground/65">
          v0.7 · Quiet desk
        </p>
      </section>
    </>
  )
}
