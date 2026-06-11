"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardMetrics } from "@/lib/api";

interface MetricCard {
  label: string;
  value: number;
  icon: React.ReactNode;
  glowClass: string;
  colorClass: string;
  bgClass: string;
}

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count}</span>;
}

export function MetricsCards({ metrics }: { metrics: DashboardMetrics | null }) {
  const cards: MetricCard[] = [
    {
      label: "Total Orders",
      value: metrics?.total_orders || 0,
      glowClass: "",
      colorClass: "text-foreground",
      bgClass: "bg-secondary",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Matched",
      value: metrics?.matched_orders || 0,
      glowClass: "",
      colorClass: "text-foreground",
      bgClass: "bg-secondary",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Completed",
      value: metrics?.completed_orders || 0,
      glowClass: "",
      colorClass: "text-foreground",
      bgClass: "bg-secondary",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      label: "Failed",
      value: metrics?.failed_orders || 0,
      glowClass: "",
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
  ];

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-black/5 mac-shadow">
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, i) => (
        <Card
          key={card.label}
          className={`animate-fade-in border-black/5 mac-shadow ${card.glowClass}`}
          style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground font-medium">{card.label}</span>
              <div className={`w-10 h-10 rounded-lg ${card.bgClass} flex items-center justify-center ${card.colorClass}`}>
                {card.icon}
              </div>
            </div>
            <div className={`text-3xl font-semibold tracking-tight ${card.colorClass}`}>
              <AnimatedCounter target={card.value} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
