import { Fragment, type ReactNode } from 'react';

type MarkdownBlock =
  | { type: 'code'; language: string; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'quote'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'rule' }
  | { type: 'paragraph'; lines: string[] };

const inlineTokenPattern =
  /(`[^`\n]+`|\*\*[^*\n](?:.*?[^*\n])?\*\*|__[^_\n](?:.*?[^_\n])?__|~~[^~\n](?:.*?[^~\n])?~~|\[[^\]\n]+\]\([^\s)]+(?:\s+"[^"]*")?\)|\*[^*\n]+\*|_[^_\n]+_)/g;

function safeHref(value: string) {
  const href = value.trim();
  if (/^(https?:|mailto:)/i.test(href) || /^(?:\/|#|\.\.?\/)/.test(href)) return href;
  return undefined;
}

function inlineMarkdown(value: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let tokenIndex = 0;
  for (const match of value.matchAll(inlineTokenPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(value.slice(cursor, index));
    const token = match[0];
    const key = `${keyPrefix}-${tokenIndex++}`;
    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key}>{inlineMarkdown(token.slice(2, -2), `${key}-strong`)}</strong>);
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={key}>{inlineMarkdown(token.slice(2, -2), `${key}-del`)}</del>);
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/.exec(token);
      const href = link ? safeHref(link[2]) : undefined;
      nodes.push(
        href ? (
          <a
            href={href}
            key={key}
            rel={/^https?:/i.test(href) ? 'noreferrer' : undefined}
            target={/^https?:/i.test(href) ? '_blank' : undefined}
            title={link?.[3]}
          >
            {inlineMarkdown(link?.[1] ?? token, `${key}-link`)}
          </a>
        ) : (
          token
        ),
      );
    } else {
      nodes.push(<em key={key}>{inlineMarkdown(token.slice(1, -1), `${key}-em`)}</em>);
    }
    cursor = index + token.length;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableDivider(line: string) {
  const cells = tableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function markdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const fence = /^\s*```([^`]*)$/.exec(line);
    if (fence) {
      const content: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        content.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({
        type: 'code',
        language: fence[1].trim().slice(0, 32),
        content: content.join('\n'),
      });
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, content: heading[2].trim() });
      index += 1;
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }
    if (index + 1 < lines.length && line.includes('|') && isTableDivider(lines[index + 1])) {
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', lines: quote });
      continue;
    }
    const listItem = /^\s*(?:(\d+)[.)]|[-+*])\s+(.+)$/.exec(line);
    if (listItem) {
      const ordered = Boolean(listItem[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const item = /^\s*(?:(\d+)[.)]|[-+*])\s+(.+)$/.exec(lines[index]);
        if (!item || Boolean(item[1]) !== ordered) break;
        items.push(item[2]);
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index];
      if (
        paragraph.length &&
        (/^\s*```/.test(next) ||
          /^(#{1,6})\s+/.test(next) ||
          /^\s*>\s?/.test(next) ||
          /^\s*(?:(\d+)[.)]|[-+*])\s+/.test(next) ||
          /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(next))
      )
        break;
      paragraph.push(next.trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', lines: paragraph });
  }
  return blocks;
}

function MarkdownHeading({
  block,
  index,
}: {
  block: Extract<MarkdownBlock, { type: 'heading' }>;
  index: number;
}) {
  const content = inlineMarkdown(block.content, `heading-${index}`);
  if (block.level <= 2) return <h3>{content}</h3>;
  if (block.level === 3) return <h4>{content}</h4>;
  if (block.level === 4) return <h5>{content}</h5>;
  return <h6>{content}</h6>;
}

export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="markdown-content">
      {markdownBlocks(children).map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading')
          return <MarkdownHeading block={block} index={index} key={key} />;
        if (block.type === 'code') {
          return (
            <div className="markdown-content__code" key={key}>
              {block.language ? <span>{block.language}</span> : null}
              <pre aria-label={block.language ? `${block.language} code` : 'Code'} tabIndex={0}>
                <code>{block.content}</code>
              </pre>
            </div>
          );
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={key}>
              {block.lines.map((line, lineIndex) => (
                <Fragment key={`${key}-${lineIndex}`}>
                  {lineIndex ? <br /> : null}
                  {inlineMarkdown(line, `${key}-${lineIndex}`)}
                </Fragment>
              ))}
            </blockquote>
          );
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul';
          return (
            <List key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>
                  {inlineMarkdown(item.replace(/^\[[ xX]\]\s*/, ''), `${key}-${itemIndex}`)}
                </li>
              ))}
            </List>
          );
        }
        if (block.type === 'table') {
          return (
            <div className="markdown-content__table" key={key} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    {block.headers.map((header, cellIndex) => (
                      <th key={`${key}-header-${cellIndex}`} scope="col">
                        {inlineMarkdown(header, `${key}-header-${cellIndex}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${key}-row-${rowIndex}`}>
                      {block.headers.map((_, cellIndex) => (
                        <td key={`${key}-cell-${rowIndex}-${cellIndex}`}>
                          {inlineMarkdown(row[cellIndex] ?? '', `${key}-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'rule') return <hr key={key} />;
        return (
          <p key={key}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={`${key}-${lineIndex}`}>
                {lineIndex ? ' ' : null}
                {inlineMarkdown(line, `${key}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
