// Emojis personalizados do painel (ilustrações em SVG, coloridas, com brilho), no lugar dos emojis comuns do sistema.
// Uso: <Emo n="home" size={22} />. Todos desenhados em uma grade de 40×40.
import type { ReactNode } from "react";

const g = (id: string, a: string, b: string, x2 = "0", y2 = "1") =>
  <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>;

const ICONES = {
  home: <><defs>{g("eh1", "#ff8a5c", "#e5432d")}{g("eh2", "#fff7e0", "#ffd68a")}</defs>
    <path d="M20 6.5 7.5 17.5V33a2.6 2.6 0 0 0 2.6 2.6h19.8a2.6 2.6 0 0 0 2.6-2.6V17.5z" fill="url(#eh2)" />
    <rect x="26" y="7" width="4.4" height="9" rx="1.2" fill="#c8392a" />
    <path d="M20 3.4 2.9 18.3c-1 .9-.4 2.5 1 2.5h2.6L20 8.9l13.5 11.9H36c1.4 0 2-1.6 1-2.5z" fill="url(#eh1)" />
    <rect x="16.2" y="23" width="7.6" height="12.6" rx="2.4" fill="#8b5a2b" /><circle cx="22" cy="29.6" r="0.9" fill="#ffd68a" />
    <rect x="10.4" y="21.6" width="4.8" height="4.8" rx="1.2" fill="#8fd8ff" /><rect x="24.8" y="21.6" width="4.8" height="4.8" rx="1.2" fill="#8fd8ff" />
    <path d="M7 19.4 19 9.6" stroke="#fff" strokeOpacity=".38" strokeWidth="1.6" strokeLinecap="round" /></>,

  robot: <><defs>{g("er1", "#97b8ff", "#3f63f0")}{g("er2", "#ffd45e", "#ff6b5a")}</defs>
    <rect x="18.9" y="4" width="2.2" height="6" rx="1.1" fill="#8da2ff" /><circle cx="20" cy="4.4" r="3" fill="url(#er2)" />
    <rect x="2.8" y="19" width="4.6" height="10" rx="2.3" fill="#5d78f5" /><rect x="32.6" y="19" width="4.6" height="10" rx="2.3" fill="#5d78f5" />
    <rect x="6" y="9" width="28" height="26" rx="9.5" fill="url(#er1)" /><rect x="9.8" y="14" width="20.4" height="15.6" rx="7" fill="#0f1535" />
    <circle cx="15.4" cy="21" r="2.9" fill="#6ef2b0" /><circle cx="24.6" cy="21" r="2.9" fill="#6ef2b0" />
    <circle cx="16.2" cy="20.1" r="0.9" fill="#fff" /><circle cx="25.4" cy="20.1" r="0.9" fill="#fff" />
    <path d="M16.6 26c2 1.7 4.8 1.7 6.8 0" stroke="#6ef2b0" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    <path d="M10 11.6h9" stroke="#fff" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" /></>,

  chart: <><defs>{g("ec1", "#ffffff", "#d8e2ff")}{g("ec2", "#6ee7b7", "#10b981")}{g("ec3", "#7db4ff", "#3b6df0")}{g("ec4", "#ffb86b", "#f4571f")}</defs>
    <rect x="3.5" y="4.5" width="33" height="31" rx="9" fill="url(#ec1)" />
    <rect x="9" y="21" width="5.4" height="9.4" rx="2" fill="url(#ec2)" /><rect x="17.3" y="14.6" width="5.4" height="15.8" rx="2" fill="url(#ec3)" /><rect x="25.6" y="9.4" width="5.4" height="21" rx="2" fill="url(#ec4)" />
    <path d="M7 8.6h9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></>,

  people: <><defs>{g("ep1", "#b79bff", "#6d3fe6")}{g("ep2", "#ffa3cf", "#e63e93")}</defs>
    <path d="M18.4 34c0-5.2 3.9-8.8 8.8-8.8s8.8 3.6 8.8 8.8z" fill="url(#ep2)" /><circle cx="27.2" cy="14.4" r="5.4" fill="#ffd5b0" />
    <path d="M21.8 13.6c.2-3.8 2.8-5.6 5.6-5.6 3 0 5.2 2 5.3 5.2-1.6-2.2-4.2-2.8-6.3-2.4-1.9.3-3.4 1.4-4.6 2.8z" fill="#5a2a47" />
    <path d="M3.6 35c0-6.6 5-11 11.4-11s11.4 4.4 11.4 11z" fill="url(#ep1)" /><circle cx="15" cy="15.4" r="6.4" fill="#ffe3c6" />
    <path d="M8.4 14.6C8.2 10 11.4 8 15 8c3.8 0 6.8 2.4 6.6 6.6-2.4-2-5.4-2.4-8-1.4-1.9.7-3.6 1.8-5.2 1.4z" fill="#3a2a6e" />
    <circle cx="12.6" cy="16.2" r="0.95" fill="#3a2a2a" /><circle cx="17.4" cy="16.2" r="0.95" fill="#3a2a2a" />
    <path d="M12.8 19.2c1.4 1.2 3 1.2 4.4 0" stroke="#c0564b" strokeWidth="1.2" fill="none" strokeLinecap="round" /></>,

  money: <><defs>{g("em1", "#e9b24a", "#b9770e")}{g("em2", "#fff08a", "#f4a30c")}</defs>
    <circle cx="14.6" cy="15.6" r="10.4" fill="url(#em1)" /><circle cx="14.6" cy="15.6" r="7.4" fill="none" stroke="#7a4a00" strokeOpacity=".45" strokeWidth="1.4" />
    <circle cx="24.4" cy="24.4" r="12.2" fill="url(#em2)" /><circle cx="24.4" cy="24.4" r="8.8" fill="none" stroke="#a85f00" strokeOpacity=".55" strokeWidth="1.6" />
    <path d="M28 20.6c-.8-1.6-2.3-2.3-4-2.3-2.3 0-4 1.2-4 3 0 4.3 8.2 2.1 8.2 6.6 0 1.8-1.8 3.1-4.4 3.1-2 0-3.6-.8-4.4-2.4M24.4 15.8v2.5M24.4 33.2v2.4" stroke="#8a4b00" strokeWidth="2.1" fill="none" strokeLinecap="round" />
    <path d="M7.4 4.2l1.1 2.7 2.7 1.1-2.7 1.1-1.1 2.7-1.1-2.7L3.6 8l2.7-1.1z" fill="#fff6a8" /></>,

  box: <><defs>{g("eb1", "#f4d29b", "#e2b36e")}{g("eb2", "#d9a05a", "#b9792f")}{g("eb3", "#b9792f", "#8d5520")}</defs>
    <path d="M20 5 35.5 12.4 20 19.8 4.5 12.4z" fill="url(#eb1)" /><path d="M4.5 12.4 20 19.8V35.4L4.5 28z" fill="url(#eb2)" /><path d="M35.5 12.4 20 19.8V35.4L35.5 28z" fill="url(#eb3)" />
    <path d="M12.3 8.7 27.8 16.1 23.3 18.3 7.8 10.9z" fill="#fff" fillOpacity=".55" />
    <path d="M8 18.4l6.2 2.9v4.6L8 23z" fill="#fff" fillOpacity=".5" /><path d="M20 19.8V35.4" stroke="#000" strokeOpacity=".12" /></>,

  ticket: <><defs>{g("et1", "#ff9dc0", "#ef3d86")}</defs>
    <path d="M4.5 12.8A3.8 3.8 0 0 1 8.3 9h23.4a3.8 3.8 0 0 1 3.8 3.8v3.2a4.1 4.1 0 0 0 0 8.1v3.1a3.8 3.8 0 0 1-3.8 3.8H8.3a3.8 3.8 0 0 1-3.8-3.8v-3.1a4.1 4.1 0 0 0 0-8.1z" fill="url(#et1)" />
    <path d="M26.4 11v18" stroke="#fff" strokeOpacity=".75" strokeWidth="1.7" strokeDasharray="2.4 2.4" />
    <path d="M15.4 14.2l1.7 3.4 3.7.5-2.7 2.6.7 3.7-3.4-1.8-3.4 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#fff6c9" />
    <path d="M7 12.4h10" stroke="#fff" strokeOpacity=".4" strokeWidth="1.8" strokeLinecap="round" /></>,

  gear: <><defs>{g("eg1", "#e6edfb", "#6b7c9e")}{g("eg2", "#99a8c8", "#46557a")}</defs>
    <g fill="url(#eg1)">{[0, 45, 90, 135].map((a) => <rect key={a} x="17.3" y="3" width="5.4" height="34" rx="1.7" transform={`rotate(${a} 20 20)`} />)}</g>
    <circle cx="20" cy="20" r="11.6" fill="url(#eg1)" /><circle cx="20" cy="20" r="5.6" fill="#2a3552" /><circle cx="20" cy="20" r="3.4" fill="url(#eg2)" />
    <path d="M10.6 15.4a10.6 10.6 0 0 1 6-5" stroke="#fff" strokeOpacity=".7" strokeWidth="1.8" fill="none" strokeLinecap="round" /></>,

  shield: <><defs>{g("es1", "#6ff0d6", "#0d9488")}</defs>
    <path d="M20 3.4 33.6 8.4v10.4c0 8.3-5.6 14.5-13.6 17.9C12 33.3 6.4 27.1 6.4 18.8V8.4z" fill="url(#es1)" />
    <path d="M20 3.4v33.3C12 33.3 6.4 27.1 6.4 18.8V8.4z" fill="#fff" fillOpacity=".2" />
    <path d="m13.2 19.6 5 5 8.8-9.8" stroke="#fff" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,

  chat: <><defs>{g("ed1", "#9aa3ff", "#4551d6")}</defs>
    <path d="M8.5 6h23A5 5 0 0 1 36.5 11v13.4a5 5 0 0 1-5 5H21.6L13 36.2v-6.8H8.5a5 5 0 0 1-5-5V11A5 5 0 0 1 8.5 6z" fill="url(#ed1)" />
    <circle cx="12.6" cy="17.8" r="2.5" fill="#fff" /><circle cx="20" cy="17.8" r="2.5" fill="#fff" /><circle cx="27.4" cy="17.8" r="2.5" fill="#fff" />
    <path d="M8 9.4h12" stroke="#fff" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" /></>,

  sliders: <><defs>{g("el1", "#4b5370", "#252b40")}</defs>
    <rect x="3.5" y="4.5" width="33" height="31" rx="9" fill="url(#el1)" />
    {[11.5, 20, 28.5].map((x) => <rect key={x} x={x - 1.5} y="9.5" width="3" height="21" rx="1.5" fill="#fff" fillOpacity=".22" />)}
    <circle cx="11.5" cy="23" r="3.6" fill="#6ef2b0" /><circle cx="20" cy="15" r="3.6" fill="#ffd45e" /><circle cx="28.5" cy="25" r="3.6" fill="#ff8ab8" />
    <path d="M8 8.2h9" stroke="#fff" strokeOpacity=".3" strokeWidth="1.6" strokeLinecap="round" /></>,

  layers: <><defs>{g("ey1", "#cdbbff", "#8c63f5")}{g("ey2", "#a98af7", "#6c3fe0")}{g("ey3", "#8466e6", "#4d27b8")}</defs>
    <path d="M20 21 36 28.6 20 36.2 4 28.6z" fill="url(#ey3)" /><path d="M20 14.2 36 21.8 20 29.4 4 21.8z" fill="url(#ey2)" /><path d="M20 4.6 36 12.2 20 19.8 4 12.2z" fill="url(#ey1)" />
    <path d="M10.4 11.2 20 6.8" stroke="#fff" strokeOpacity=".6" strokeWidth="1.8" strokeLinecap="round" /></>,

  infinity: <><defs>{g("ei1", "#7be3ff", "#3b6df0", "1", "0")}</defs>
    <rect x="3.5" y="7.5" width="33" height="25" rx="8.5" fill="#101a3a" />
    <path d="M20 20c-2.6-4.4-5.2-6-8-6-3.2 0-5.4 2.6-5.4 6s2.2 6 5.4 6c2.8 0 5.4-1.6 8-6zm0 0c2.6 4.4 5.2 6 8 6 3.2 0 5.4-2.6 5.4-6s-2.2-6-5.4-6c-2.8 0-5.4 1.6-8 6z" fill="none" stroke="url(#ei1)" strokeWidth="3.6" strokeLinejoin="round" /></>,

  notepad: <><defs>{g("en1", "#ffffff", "#dfe6ff")}{g("en2", "#ffb86b", "#f4571f")}</defs>
    <rect x="6.5" y="5.5" width="27" height="30" rx="6" fill="url(#en1)" /><path d="M6.5 11.5a6 6 0 0 1 6-6h15a6 6 0 0 1 6 6v1.6h-27z" fill="url(#en2)" />
    <path d="M12.2 19.2h15.6M12.2 24.6h15.6M12.2 30h9.4" stroke="#8d9ad0" strokeWidth="2.4" strokeLinecap="round" />
    <rect x="12" y="3" width="3" height="6.4" rx="1.5" fill="#7a3b12" /><rect x="25" y="3" width="3" height="6.4" rx="1.5" fill="#7a3b12" /></>,

  doc: <><defs>{g("ee1", "#ffffff", "#d9e2ff")}{g("ee2", "#63a4ff", "#2f60e8")}</defs>
    <path d="M9.5 4.5h14.2L32 12.8V33a3.5 3.5 0 0 1-3.5 3.5h-19A3.5 3.5 0 0 1 6 33V8A3.5 3.5 0 0 1 9.5 4.5z" fill="url(#ee1)" />
    <path d="M23.7 4.5V9.3a3.5 3.5 0 0 0 3.5 3.5H32z" fill="#b8c6f5" />
    <rect x="9.5" y="20.5" width="19" height="9" rx="2.6" fill="url(#ee2)" />
    <path d="M12.8 23.4h3.4M14.5 23.4v4.3M18.4 23.4l3 4.3M21.4 23.4l-3 4.3M23.4 23.4h3.4M25 23.4v4.3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></>,

  ghost: <><defs>{g("eo1", "#ffffff", "#c7d2ff")}</defs>
    <path d="M20 4.4c-7.2 0-12.4 5.2-12.4 12.6v17.2c0 1.1 1.2 1.7 2.1.9l2.6-2.2c.5-.4 1.2-.4 1.7 0l2.7 2.2c.5.4 1.2.4 1.7 0L20 33.4l1.6 1.7c.5.4 1.2.4 1.7 0l2.7-2.2c.5-.4 1.2-.4 1.7 0l2.6 2.2c.9.8 2.1.2 2.1-.9V17C32.4 9.6 27.2 4.4 20 4.4z" fill="url(#eo1)" />
    <ellipse cx="15.2" cy="17.6" rx="2.3" ry="3" fill="#1a1f3d" /><ellipse cx="24.8" cy="17.6" rx="2.3" ry="3" fill="#1a1f3d" />
    <circle cx="15.9" cy="16.4" r="0.8" fill="#fff" /><circle cx="25.5" cy="16.4" r="0.8" fill="#fff" />
    <ellipse cx="11.7" cy="23" rx="2.1" ry="1.3" fill="#ff9ec4" fillOpacity=".7" /><ellipse cx="28.3" cy="23" rx="2.1" ry="1.3" fill="#ff9ec4" fillOpacity=".7" />
    <path d="M17.6 24c1.4 1.5 3.4 1.5 4.8 0" stroke="#1a1f3d" strokeWidth="1.6" fill="none" strokeLinecap="round" /></>,

  trash: <><defs>{g("ex1", "#ff8a8a", "#e03a3a")}</defs>
    <rect x="13" y="4.4" width="14" height="5" rx="2.2" fill="#c43434" /><rect x="6.5" y="8" width="27" height="5" rx="2.5" fill="#ff7b7b" />
    <path d="M9.5 14h21l-1.6 18.4a3.3 3.3 0 0 1-3.3 3H14.4a3.3 3.3 0 0 1-3.3-3z" fill="url(#ex1)" />
    <path d="M15.5 18.6v12M20 18.6v12M24.5 18.6v12" stroke="#fff" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" /></>,

  plus: <><defs>{g("eq1", "#8cf5c2", "#16b873")}</defs>
    <circle cx="20" cy="20" r="16" fill="url(#eq1)" /><path d="M20 12.5v15M12.5 20h15" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
    <path d="M10.4 14.4a11.4 11.4 0 0 1 6.2-5" stroke="#fff" strokeOpacity=".55" strokeWidth="1.8" fill="none" strokeLinecap="round" /></>,
} satisfies Record<string, ReactNode>;

export type EmoName = keyof typeof ICONES;

export function Emo({ n, size = 22, className }: { n: EmoName; size?: number; className?: string }) {
  return <svg className={`emo${className ? ` ${className}` : ""}`} viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">{ICONES[n]}</svg>;
}
