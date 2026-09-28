'use client';
/* eslint-disable @next/next/no-img-element -- a 192px static splash icon */
import dynamic from 'next/dynamic';

// Client-only: the app reads the URL, screen size and push support on first
// render, and there's nothing useful to server-render before the job set loads.
export default dynamic(() => import('./radar'), { ssr: false, loading: () => <div className="boot"><img src="/icon-192.png" alt="Job Radar" /></div> });
