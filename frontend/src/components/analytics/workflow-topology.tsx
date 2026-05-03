"use client";

import React from "react";
import dynamic from "next/dynamic";
import { WorkflowPipeline } from "../monitor/workflow-pipeline";

const ConstellationGraph = dynamic(
    () => import("../network/constellation-graph").then(m => ({ default: m.ConstellationGraph })),
    { ssr: false, loading: () => (
        <div className="flex items-center justify-center h-full">
            <p className="text-[12px] text-gray-400 animate-pulse">Lade 3D-Topologie…</p>
        </div>
    )}
);

export const WorkflowTopology = () => (
    <div className="flex flex-col gap-0 h-full min-h-150 p-6 space-y-6">
        {/* 3D constellation — top half */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden" style={{ height: 420 }}>
            <div className="absolute top-3 left-4 z-10">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Agenten-Konstellation (3D)
                </span>
            </div>
            <ConstellationGraph />
        </div>

        {/* Linear pipeline — bottom half */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm relative">
            <div className="absolute top-3 left-4 z-10">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Workflow-Pipeline
                </span>
            </div>
            <div className="pt-10 pb-6 px-6">
                <WorkflowPipeline />
            </div>
        </div>
    </div>
);
