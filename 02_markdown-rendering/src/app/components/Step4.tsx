import { SAMPLE_MARKDOWN } from "@/data/sample";
import ReactMarkdown from 'react-markdown'
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

export default function Step4() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        Step 4. HTML (<code className="px-1 py-0.5 rounded bg-gray-100 text-xs">rehype-raw</code>) 
        + 보안 (<code className="px-1 py-0.5 rounded bg-gray-100 text-xs">rehype-sanitize</code>) 
        + 커스터마이징
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        HTML 태그를 파싱하고, XSS를 방어합니다.
      </p>
      <div className="w-full rounded-lg border border-gray-200 bg-gray-50/80 p-3">
        <div className="prose prose-sm">
          {/* rehype-raw, rehype-sanitize 사용해보기 */}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]} // rehypeSanitize - script, style 속성 제거
            components={{
              code({ node, children, className, ...props }: any) { 
                const matched = /language-(\w+)/.exec(className || '');
                if(matched) { 
                  return (
                    <SyntaxHighlighter
                      language={matched[1]}
                      PreTag="div"
                      style={vscDarkPlus}
                      {...props}
                    >
                      {children}
                    </SyntaxHighlighter>
                  )
                }
                return <code {...props}>{children}</code>
              },
              img({ src, alt, ...props }: any) { // <img src="" alt="" ... />
                return (
                  <img 
                    src={src}
                    alt={alt}
                    width={600}
                    height={320}
                    className="rounded-lg border border-gray-200"
                  />
                )
              },
              a({ href, children, ...props }: any) {
                return (
                  <a
                    {...props}
                    href={href || '#'}
                    target="_blank"
                    rel="noopener noreferer"
                    className="text-indigo-600 font-medium"
                  >
                    {children}
                  </a>
                )
              }
            }}
          >
            {SAMPLE_MARKDOWN}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}