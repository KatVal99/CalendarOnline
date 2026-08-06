import { useEffect, useRef, useState } from 'react';

interface WebNode { x: number; y: number; glow: number; radius: number; color: string }
interface WebSegment { a: WebNode; b: WebNode; elbowX: number; elbowY: number; pulse: number; speed: number; color: string }

const SPIDER_COLORS = ['#ff2a4b', '#0b5ed7', '#ffcc00', '#ffffff'];

export default function PixelStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [userBg, setUserBg] = useState<string | null>(() => localStorage.getItem('spideyBgImage'));

  useEffect(() => {
    const handleStorage = () => {
      setUserBg(localStorage.getItem('spideyBgImage'));
    };
    window.addEventListener('spidey-bg-updated', handleStorage);
    return () => window.removeEventListener('spidey-bg-updated', handleStorage);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let nodes: WebNode[] = [];
    let segments: WebSegment[] = [];

    let customImg: HTMLImageElement | null = null;
    const bgSrc = userBg || './background.jpg';

    const img = new Image();
    img.src = bgSrc;
    img.onload = () => {
      customImg = img;
    };
    img.onerror = () => {
      // Fallback try background.png or custom-bg.png
      const fallbackImg = new Image();
      fallbackImg.src = './background.png';
      fallbackImg.onload = () => { customImg = fallbackImg; };
    };

    const rebuild = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const step = Math.max(90, Math.min(130, Math.floor(window.innerWidth / 10)));
      nodes = [];
      for (let y = 30; y < canvas.height; y += step) {
        for (let x = 30; x < canvas.width; x += step) {
          nodes.push({
            x: x + (Math.random() * 24 - 12),
            y: y + (Math.random() * 24 - 12),
            glow: Math.random(),
            radius: 3 + Math.random() * 4,
            color: Math.random() > 0.4 ? '#ff2a4b' : '#0b5ed7',
          });
        }
      }
      segments = [];
      for (const node of nodes) {
        const near = nodes
          .filter((candidate) => candidate !== node)
          .map((candidate) => ({ candidate, dist: Math.hypot(candidate.x - node.x, candidate.y - node.y) }))
          .filter(({ dist }) => dist < step * 1.6)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, 3);
        near.forEach(({ candidate }, index) => {
          if (candidate.x < node.x || (candidate.x === node.x && candidate.y < node.y)) return;
          const elbowX = Math.random() > 0.5 ? candidate.x : node.x;
          const elbowY = elbowX === candidate.x ? node.y : candidate.y;
          segments.push({
            a: node,
            b: candidate,
            elbowX,
            elbowY,
            pulse: Math.random(),
            speed: 0.002 + index * 0.0015 + Math.random() * 0.002,
            color: SPIDER_COLORS[Math.floor(Math.random() * SPIDER_COLORS.length)],
          });
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (customImg && customImg.complete && customImg.naturalWidth > 0) {
        // Draw custom user background image cover full screen
        const scale = Math.max(canvas.width / customImg.naturalWidth, canvas.height / customImg.naturalHeight);
        const x = (canvas.width - customImg.naturalWidth * scale) / 2;
        const y = (canvas.height - customImg.naturalHeight * scale) / 2;
        ctx.drawImage(customImg, x, y, customImg.naturalWidth * scale, customImg.naturalHeight * scale);
      } else {
        const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bg.addColorStop(0, '#060713');
        bg.addColorStop(0.5, '#0e1124');
        bg.addColorStop(1, '#080914');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      segments.forEach((segment) => {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 42, 75, 0.16)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(segment.a.x, segment.a.y);
        ctx.lineTo(segment.elbowX, segment.elbowY);
        ctx.lineTo(segment.b.x, segment.b.y);
        ctx.stroke();

        const firstLeg = Math.hypot(segment.elbowX - segment.a.x, segment.elbowY - segment.a.y);
        const secondLeg = Math.hypot(segment.b.x - segment.elbowX, segment.b.y - segment.elbowY);
        const totalLeg = firstLeg + secondLeg || 1;
        const pulseDistance = totalLeg * segment.pulse;
        let pulseX = segment.a.x;
        let pulseY = segment.a.y;
        if (pulseDistance <= firstLeg) {
          const t = pulseDistance / Math.max(firstLeg, 1);
          pulseX = segment.a.x + (segment.elbowX - segment.a.x) * t;
          pulseY = segment.a.y + (segment.elbowY - segment.a.y) * t;
        } else {
          const t = (pulseDistance - firstLeg) / Math.max(secondLeg, 1);
          pulseX = segment.elbowX + (segment.b.x - segment.elbowX) * t;
          pulseY = segment.elbowY + (segment.b.y - segment.elbowY) * t;
        }
        ctx.strokeStyle = segment.color;
        ctx.shadowColor = segment.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = segment.color;
        ctx.fillRect(pulseX - 2, pulseY - 2, 4, 4);
        ctx.restore();

        segment.pulse += segment.speed;
        if (segment.pulse > 1.08) segment.pulse = -0.06;
      });

      nodes.forEach((node, index) => {
        node.glow += 0.02 + (index % 3) * 0.003;
        const intensity = 0.35 + ((Math.sin(node.glow) + 1) / 2) * 0.65;
        ctx.save();
        ctx.fillStyle = node.color === '#ff2a4b' ? `rgba(255,42,75,${0.14 * intensity})` : `rgba(11,94,215,${0.14 * intensity})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.2 * intensity, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(node.x - node.radius / 2, node.y - node.radius / 2, node.radius, node.radius);
        
        if (index % 7 === 0) {
          ctx.fillStyle = '#ff2a4b';
          const px = node.x, py = node.y;
          ctx.fillRect(px - 6, py - 3, 2, 1);
          ctx.fillRect(px + 4, py - 3, 2, 1);
          ctx.fillRect(px - 6, py + 3, 2, 1);
          ctx.fillRect(px + 4, py + 3, 2, 1);
        }
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    };

    rebuild();
    draw();
    window.addEventListener('resize', rebuild);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', rebuild);
    };
  }, [userBg]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.98 }} />;
}
