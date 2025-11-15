import { Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    课程: [
      { label: '课程大纲', href: '/curriculum' },
      { label: '工具生态', href: '/tools' },
      { label: '实战项目', href: '/projects' },
      { label: '学习资料', href: '/materials' },
    ],
    资料: [
      { label: 'Claude Code 架构', href: '/materials/claude-code-architecture' },
      { label: '工具对比', href: '/materials/ai-coding-tools-comparison' },
      { label: 'NotebookLM', href: '/materials/notebooklm-guide' },
    ],
    关于: [
      { label: '课程价值', href: '/about#value' },
      { label: '适合人群', href: '/about#audience' },
      { label: '讲师介绍', href: '/about#instructor' },
    ],
  };

  const socialLinks = [
    { icon: Github, href: 'https://github.com', label: 'GitHub' },
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Mail, href: 'mailto:contact@example.com', label: 'Email' },
  ];

  return (
    <footer className="border-t-2 border-graphite bg-cloud mt-space-12">
      <div className="md-container py-space-12">
        <div className="grid grid-cols-1 gap-space-2 md:grid-cols-4 mb-space-12">
          <div className="md:col-span-1">
            <h3 className="text-h3 font-bold uppercase tracking-[0.08em] bg-gradient-to-tr from-sunbeam to-sky text-transparent bg-clip-text mb-space-6">
              陈天 AI 训练营
            </h3>
            <p className="text-body text-slate mb-space-6">
              让 AI 成为你的编程超能力
            </p>
            <span className="md-badge">✨ 8周精通 AI 编程</span>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-body font-bold uppercase tracking-[0.08em] text-ink mb-space-6">
                {category}
              </h4>
              <ul className="flex flex-col gap-space-5 text-body text-slate">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="inline-flex gap-2 items-center pb-1 border-b-2 border-transparent transition-colors duration-150 hover:border-graphite hover:text-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center border-t-2 gap-space-8 border-graphite pt-space-10 text-ui text-slate md:flex-row md:justify-between">
          <p>© {currentYear} 陈天极客时间 AI 训练营 • All rights reserved.</p>
          <div className="flex items-center gap-space-8">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 transition-transform duration-150 border-graphite rounded-micro p-space-2 text-ink hover:-translate-y-1 hover:bg-softBlue"
                >
                  <Icon size={20} />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
