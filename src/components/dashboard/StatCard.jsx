import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatCard({ title, value, icon: Icon, iconColor, iconBg, subtitle }) {
  // ✅ FIX v2.7.5: Utilisation de iconColor et iconBg au lieu de bgColor
  // Cela évite l'erreur .replace() sur undefined
  const displayIconColor = iconColor || 'text-orange-600';
  const displayIconBg = iconBg || 'bg-orange-100';

  return (
    <Card className="relative overflow-hidden border-none shadow-md">
      <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${displayIconBg} rounded-full opacity-10`} />
      <CardHeader className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              {value}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${displayIconBg} bg-opacity-20`}>
            <Icon className={`w-6 h-6 ${displayIconColor}`} />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}