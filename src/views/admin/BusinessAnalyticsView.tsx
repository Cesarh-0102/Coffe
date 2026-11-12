/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vista de Estadísticas del Negocio (Business Analytics View) - Taju Coffee House
 * Utiliza 'recharts' para visualizar:
 * - Cantidad de sellos emitidos por día durante la última semana.
 * - Número de clientes activos por día y acumulados en la última semana.
 * - Facturación asociada e indicadores de retención.
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { LoyaltyCard } from '../../models/LoyaltyCard';
import { StampHistoryEntry, formatCurrency } from '../../models/StampHistory';
import {
  TrendingUp,
  Award,
  Users,
  Coffee,
  Calendar,
  DollarSign,
  RefreshCw,
  Sparkles,
  BarChart2,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface BusinessAnalyticsViewProps {
  allCards: LoyaltyCard[];
  allHistory: StampHistoryEntry[];
  loading?: boolean;
  onRefresh?: () => void;
}

interface DayData {
  isoDate: string;
  dayLabel: string;
  fullDate: string;
  stampsCount: number;
  activeCustomers: number;
  revenue: number;
  rewardsCount: number;
}

export const BusinessAnalyticsView: React.FC<BusinessAnalyticsViewProps> = ({
  allCards,
  allHistory,
  loading = false,
  onRefresh,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'individual' | 'combined' | 'table'>('individual');

  // =========================================================================
  // CÁLCULO DE MÉTRICAS DIARIAS PARA LA ÚLTIMA SEMANA (7 DÍAS CONSECUTIVOS)
  // =========================================================================
  const weeklyData = useMemo(() => {
    const days: DayData[] = [];
    const now = new Date();

    // Generar los últimos 7 días (de hace 6 días hasta hoy)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const isoDate = d.toISOString().split('T')[0]; // "YYYY-MM-DD"

      // Nombre del día en español (ej. Lun, Mar, Mié)
      const dayName = d.toLocaleDateString('es-CO', { weekday: 'short' });
      const dayNumber = d.getDate().toString().padStart(2, '0');
      const monthName = d.toLocaleDateString('es-CO', { month: 'short' });

      const dayLabel = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNumber}`;
      const fullDate = `${dayNumber} ${monthName} ${d.getFullYear()}`;

      // Filtrar transacciones de este día
      const dayEntries = allHistory.filter((entry) => {
        if (!entry.createdAt) return false;
        return entry.createdAt.startsWith(isoDate);
      });

      const stampsCount = dayEntries.length;
      const uniqueCustomerIds = new Set(dayEntries.map((e) => e.customerId));
      
      // Si la tarjeta de un cliente tiene lastPurchaseDate en este día pero no estaba en history
      allCards.forEach((card) => {
        if (card.lastPurchaseDate && card.lastPurchaseDate.startsWith(isoDate)) {
          uniqueCustomerIds.add(card.customerId);
        }
      });

      const activeCustomers = uniqueCustomerIds.size;
      const revenue = dayEntries.reduce((acc, curr) => acc + (curr.purchaseAmount || 0), 0);
      const rewardsCount = dayEntries.filter((e) => e.rewardGranted).length;

      days.push({
        isoDate,
        dayLabel,
        fullDate,
        stampsCount,
        activeCustomers,
        revenue,
        rewardsCount,
      });
    }

    return days;
  }, [allHistory, allCards]);

  // =========================================================================
  // TOTALES Y RESÚMENES SEMANALES
  // =========================================================================
  const totals = useMemo(() => {
    const totalStamps = weeklyData.reduce((acc, d) => acc + d.stampsCount, 0);
    const totalRevenue = weeklyData.reduce((acc, d) => acc + d.revenue, 0);
    const totalRewards = weeklyData.reduce((acc, d) => acc + d.rewardsCount, 0);

    // Clientes únicos que han comprado o recibido sellos en los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString().split('T')[0];

    const weeklyActiveCustomerIds = new Set<string>();

    allHistory.forEach((entry) => {
      if (entry.createdAt && entry.createdAt >= sevenDaysAgoIso) {
        weeklyActiveCustomerIds.add(entry.customerId);
      }
    });

    allCards.forEach((card) => {
      const lastDate = card.lastPurchaseDate || card.updatedAt;
      if (lastDate && lastDate >= sevenDaysAgoIso) {
        weeklyActiveCustomerIds.add(card.customerId);
      }
    });

    const activeCustomersCount = weeklyActiveCustomerIds.size;
    const avgStampsPerDay = (totalStamps / 7).toFixed(1);

    return {
      totalStamps,
      totalRevenue,
      totalRewards,
      activeCustomersCount,
      avgStampsPerDay,
    };
  }, [weeklyData, allHistory, allCards]);

  // =========================================================================
  // TOOLTIPS PERSONALIZADOS PARA RECHARTS
  // =========================================================================
  const CustomStampsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DayData;
      return (
        <div className="bg-[#16191C] text-white p-3.5 rounded-2xl shadow-xl border border-gray-700 text-xs font-sans min-w-[170px]">
          <p className="font-display font-extrabold text-sm text-[#FFEDE5] pb-1 border-b border-gray-700 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-gray-400 font-mono">{data.fullDate}</span>
          </p>
          <div className="mt-2 space-y-1.5">
            <p className="flex items-center justify-between">
              <span className="text-gray-400">Sellos Emitidos:</span>
              <span className="font-extrabold text-[#D8470A] font-mono text-sm">
                {data.stampsCount}
              </span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-gray-400">Clientes Atendidos:</span>
              <span className="font-bold text-white font-mono">{data.activeCustomers}</span>
            </p>
            {data.revenue > 0 && (
              <p className="flex items-center justify-between pt-1 border-t border-gray-800 text-[11px]">
                <span className="text-gray-400">Ventas:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatCurrency(data.revenue)}
                </span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomCustomersTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DayData;
      return (
        <div className="bg-[#16191C] text-white p-3.5 rounded-2xl shadow-xl border border-gray-700 text-xs font-sans min-w-[170px]">
          <p className="font-display font-extrabold text-sm text-[#FFEDE5] pb-1 border-b border-gray-700 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-gray-400 font-mono">{data.fullDate}</span>
          </p>
          <div className="mt-2 space-y-1.5">
            <p className="flex items-center justify-between">
              <span className="text-gray-400">Clientes Activos:</span>
              <span className="font-extrabold text-emerald-400 font-mono text-sm">
                {data.activeCustomers}
              </span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-gray-400">Sellos Recibidos:</span>
              <span className="font-bold text-[#D8470A] font-mono">{data.stampsCount}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* =========================================================================
          ENCABEZADO DE LA VISTA DE ESTADÍSTICAS
         ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#16191C] to-[#2A2E35] flex items-center justify-center text-[#D8470A] shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#16191C]">
                  Estadísticas del Negocio
                </h2>
                <span className="bg-[#FFEDE5] text-[#D8470A] text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Últimos 7 Días
                </span>
              </div>
              <p className="text-xs text-gray-500 font-sans mt-0.5">
                Seguimiento analítico de sellos emitidos, concurrencia de clientes y retención en Taju Coffee House.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones y Selector de Vista */}
        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer disabled:opacity-50"
              title="Refrescar datos analíticos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D8470A]' : ''}`} />
            </button>
          )}

          {/* Botones de alternancia de vista */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setActiveChartTab('individual')}
              className={`text-xs font-display font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'individual'
                  ? 'bg-white text-[#D8470A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              <span>Separados</span>
            </button>

            <button
              onClick={() => setActiveChartTab('combined')}
              className={`text-xs font-display font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'combined'
                  ? 'bg-white text-[#D8470A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              <span>Combinado</span>
            </button>

            <button
              onClick={() => setActiveChartTab('table')}
              className={`text-xs font-display font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'table'
                  ? 'bg-white text-[#D8470A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              <span>Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TARJETAS KPI RESUMEN DE LA SEMANA
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sellos Emitidos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
              SELLOS EMITIDOS (SEMANA)
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D8470A] flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-display font-extrabold text-3xl text-[#16191C]">
              {totals.totalStamps}
            </span>
            <span className="text-xs text-gray-500 font-sans">
              sellos totales
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 font-sans flex items-center space-x-1">
            <span className="text-[#D8470A] font-bold">~{totals.avgStampsPerDay}</span>
            <span>sellos promedio al día</span>
          </p>
        </div>

        {/* KPI 2: Clientes Activos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
              CLIENTES ACTIVOS (SEMANA)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-display font-extrabold text-3xl text-[#16191C]">
              {totals.activeCustomersCount}
            </span>
            <span className="text-xs text-gray-500 font-sans">
              clientes únicos
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 font-sans">
            De una base de <strong className="text-gray-700">{allCards.length}</strong> clientes registrados
          </p>
        </div>

        {/* KPI 3: Facturación Registrada */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
              VENTAS ASOCIADAS A SELLOS
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-display font-extrabold text-2xl text-[#16191C]">
              {formatCurrency(totals.totalRevenue)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 font-sans">
            Compras mínimas válidas de $15.000
          </p>
        </div>

        {/* KPI 4: Premios / Ciclos Canjeados */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
              PREMIOS ENTREGADOS
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-display font-extrabold text-3xl text-[#16191C]">
              {totals.totalRewards}
            </span>
            <span className="text-xs text-gray-500 font-sans">
              ciclos de 8 sellos
            </span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600 font-sans font-medium flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Café especial + repostería artesanal</span>
          </p>
        </div>
      </div>

      {/* =========================================================================
          VISTA 1: GRÁFICOS SEPARADOS (SELLOS POR DÍA + CLIENTES ACTIVOS POR DÍA)
         ========================================================================= */}
      {activeChartTab === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* GRÁFICO A: CANTIDAD DE SELLOS EMITIDOS POR DÍA */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-md bg-[#D8470A]" />
                  <h3 className="font-display font-extrabold text-base text-[#16191C]">
                    Sellos Emitidos por Día
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-[#D8470A] bg-orange-50 px-2.5 py-0.5 rounded-full">
                  Total: {totals.totalStamps}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-sans mb-4">
                Volumen diario de sellos otorgados en caja por consumo.
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomStampsTooltip />} cursor={{ fill: 'rgba(216, 71, 10, 0.05)' }} />
                  <Bar
                    dataKey="stampsCount"
                    name="Sellos"
                    fill="#D8470A"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-sans">
              <span>Día con mayor emisión:</span>
              <span className="font-bold text-[#16191C]">
                {weeklyData.reduce((max, d) => (d.stampsCount > max.stampsCount ? d : max), weeklyData[0]).dayLabel} (
                {weeklyData.reduce((max, d) => (d.stampsCount > max.stampsCount ? d : max), weeklyData[0]).stampsCount} sellos)
              </span>
            </div>
          </div>

          {/* GRÁFICO B: NÚMERO DE CLIENTES ACTIVOS POR DÍA */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-md bg-emerald-500" />
                  <h3 className="font-display font-extrabold text-base text-[#16191C]">
                    Clientes Activos por Día
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Semanal: {totals.activeCustomersCount} únicos
                </span>
              </div>
              <p className="text-xs text-gray-500 font-sans mb-4">
                Clientes fidelizados únicos que realizaron compras y sumaron sellos.
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActiveCustomers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomCustomersTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="activeCustomers"
                    name="Clientes Activos"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorActiveCustomers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-sans">
              <span>Día con mayor afluencia:</span>
              <span className="font-bold text-[#16191C]">
                {weeklyData.reduce((max, d) => (d.activeCustomers > max.activeCustomers ? d : max), weeklyData[0]).dayLabel} (
                {weeklyData.reduce((max, d) => (d.activeCustomers > max.activeCustomers ? d : max), weeklyData[0]).activeCustomers} clientes)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 2: GRÁFICO COMBINADO (SELLOS VS CLIENTES ACTIVOS)
         ========================================================================= */}
      {activeChartTab === 'combined' && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-display font-extrabold text-lg text-[#16191C]">
                Relación Sellos Emitidos vs Clientes Activos
              </h3>
              <p className="text-xs text-gray-500 font-sans mt-0.5">
                Comparativa de barras (Sellos emitidos) con línea de tendencia de asistencia de clientes únicos.
              </p>
            </div>

            <div className="flex items-center space-x-4 text-xs font-sans">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-[#D8470A]" />
                <span className="text-gray-700 font-bold">Sellos Emitidos</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-700 font-bold">Clientes Activos</span>
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomStampsTooltip />} />
                <Bar
                  dataKey="stampsCount"
                  name="Sellos Emitidos"
                  fill="#D8470A"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
                <Line
                  type="monotone"
                  dataKey="activeCustomers"
                  name="Clientes Activos"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 3: TABLA DE DETALLE DIARIO
         ========================================================================= */}
      {activeChartTab === 'table' && (
        <div className="bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-display font-extrabold text-base text-[#16191C]">
                Desglose Diario de Actividad (Última Semana)
              </h3>
              <p className="text-xs text-gray-500 font-sans mt-0.5">
                Detalle exhaustivo de emisión de sellos, afluencia y ventas registradas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-display uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-5">Fecha / Día</th>
                  <th className="py-3 px-5 text-center">Sellos Emitidos</th>
                  <th className="py-3 px-5 text-center">Clientes Activos</th>
                  <th className="py-3 px-5 text-center">Premios Entregados</th>
                  <th className="py-3 px-5 text-right">Facturación Estimada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weeklyData.map((day) => (
                  <tr key={day.isoDate} className="hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 px-5">
                      <span className="font-bold text-[#16191C] block">{day.dayLabel}</span>
                      <span className="text-[11px] text-gray-400 font-mono">{day.fullDate}</span>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className="inline-block bg-orange-100 text-[#D8470A] font-bold font-mono px-2.5 py-0.5 rounded-full text-xs">
                        {day.stampsCount} sellos
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className="inline-block bg-emerald-100 text-emerald-800 font-bold font-mono px-2.5 py-0.5 rounded-full text-xs">
                        {day.activeCustomers} clientes
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center">
                      {day.rewardsCount > 0 ? (
                        <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded-full text-[11px]">
                          <Award className="w-3 h-3" />
                          <span>{day.rewardsCount}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-[#16191C]">
                      {day.revenue > 0 ? formatCurrency(day.revenue) : '$0'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs text-[#16191C]">
                  <td className="py-3 px-5 uppercase font-display text-[11px]">
                    Total Semana
                  </td>
                  <td className="py-3 px-5 text-center font-mono text-[#D8470A] text-sm">
                    {totals.totalStamps} sellos
                  </td>
                  <td className="py-3 px-5 text-center font-mono text-emerald-700 text-sm">
                    {totals.activeCustomersCount} únicos
                  </td>
                  <td className="py-3 px-5 text-center font-mono text-amber-600 text-sm">
                    {totals.totalRewards} premios
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-[#16191C] text-sm">
                    {formatCurrency(totals.totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          INFORMACIÓN DE RETENCIÓN Y AUDITORÍA
         ========================================================================= */}
      <div className="bg-[#16191C] text-white rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-orange-600/30 border border-orange-500/40 text-[#D8470A] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h4 className="font-display font-extrabold text-base text-white">
              Automatización de Retención a 7 Días Activa
            </h4>
            <p className="text-xs text-gray-400 font-sans mt-0.5 leading-relaxed">
              Los clientes que no han registrado sellos en más de 7 días se etiquetan automáticamente
              en OneSignal y aparecen resaltados en la pestaña de <strong>Fidelizados</strong> con el botón directo de WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>OneSignal & WhatsApp Sincronizados</span>
          </span>
        </div>
      </div>

    </div>
  );
};
