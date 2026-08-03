import { useEffect, useRef } from 'react';

interface NodePoint { x: number; y: number; glow: number; radius: number }
interface Segment { a: NodePoint; b: NodePoint; elbowX: number; elbowY: number; pulse: number; speed: number; color: string }

const CIRCUIT_COLORS = ['#00ff88', '#00ffff', '#ff00ff'];

export default function PixelStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let nodes: NodePoint[] = [];
    let segments: Segment[] = [];

    const rebuild = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const step = 110;
      nodes = [];
      for (let y = 40; y < canvas.height; y += step) {
        for (let x = 40; x < canvas.width; x += step) {
          nodes.push({ x: x + (Math.random() * 20 - 10), y: y + (Math.random() * 20 - 10), glow: Math.random(), radius: 4 + Math.random() * 4 });
        }
      }
      segments = [];
      for (const node of nodes) {
        const near = nodes
          .filter((candidate) => candidate !== node)
          .map((candidate) => ({ candidate, dist: Math.hypot(candidate.x - node.x, candidate.y - node.y) }))
          .filter(({ dist }) => dist < 190)
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
            speed: 0.003 + index * 0.0015 + Math.random() * 0.002,
            color: CIRCUIT_COLORS[Math.floor(Math.random() * CIRCUIT_COLORS.length)],
          });
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, '#050508');
      bg.addColorStop(1, '#080814');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      segments.forEach((segment) => {
        ctx.save();
        ctx.strokeStyle = 'rgba(30, 255, 190, 0.12)';
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
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
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
        ctx.fillStyle = `rgba(0,255,255,${0.12 * intensity})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2 * intensity, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(0,255,255,${0.8 * intensity})`;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 12;
        ctx.fillRect(node.x - node.radius / 2, node.y - node.radius / 2, node.radius, node.radius);
        ctx.strokeStyle = 'rgba(0,255,255,0.18)';
        ctx.strokeRect(node.x - 7, node.y - 7, 14, 14);
        if (Math.random() < 0.006) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(node.x - 8, node.y);
          ctx.lineTo(node.x + 8, node.y);
          ctx.moveTo(node.x, node.y - 8);
          ctx.lineTo(node.x, node.y + 8);
          ctx.stroke();
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
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.9 }} />;
}

