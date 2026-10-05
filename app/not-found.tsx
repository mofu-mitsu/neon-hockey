import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-mono tracking-widest mb-4">
        ✦ 404 NOT FOUND ✦
      </div>
      <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pink-400 to-amber-300 tracking-tight mb-3">
        PAGE NOT FOUND
      </h1>
      <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
        お探しのページは見つかりませんでした。リンクが無効になっているか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all inline-flex items-center gap-2"
      >
        <span>トップページへ戻る</span>
        <span>→</span>
      </Link>
    </div>
  );
}
