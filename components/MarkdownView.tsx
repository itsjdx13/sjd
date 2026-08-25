import type { ReactNode } from 'react';

export function MarkdownView({ content }: { content: string }) {
  const nodes: ReactNode[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let code: string[] = [];
  let inCode = false;

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      if (inCode) { nodes.push(<pre key={`code-${index}`}><code>{code.join('\n')}</code></pre>); code = []; }
      inCode = !inCode;
      return;
    }
    if (inCode) { code.push(line); return; }
    if (line.startsWith('### ')) nodes.push(<h3 key={index}>{line.slice(4)}</h3>);
    else if (line.startsWith('## ')) nodes.push(<h2 key={index}>{line.slice(3)}</h2>);
    else if (line.startsWith('# ')) nodes.push(<h1 key={index}>{line.slice(2)}</h1>);
    else if (/^[-*] \[[ xX]\] /.test(line)) nodes.push(<div className="md-check" key={index}><span>{line[3].toLowerCase() === 'x' ? '✓' : ''}</span>{line.slice(6)}</div>);
    else if (/^[-*] /.test(line)) nodes.push(<div className="md-list" key={index}><span>•</span>{line.slice(2)}</div>);
    else if (/^\d+\. /.test(line)) nodes.push(<div className="md-list numbered" key={index}><span>{line.match(/^\d+/)?.[0]}.</span>{line.replace(/^\d+\. /, '')}</div>);
    else if (line.startsWith('> ')) nodes.push(<blockquote key={index}>{line.slice(2)}</blockquote>);
    else if (line.trim() === '---') nodes.push(<hr key={index}/>);
    else if (!line.trim()) nodes.push(<div className="md-space" key={index}/>);
    else nodes.push(<p key={index}>{line}</p>);
  });
  if (inCode) nodes.push(<pre key="code-final"><code>{code.join('\n')}</code></pre>);
  return <article className="markdown-view" dir="auto">{nodes}</article>;
}
