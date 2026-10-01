/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}