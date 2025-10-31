import React, { useEffect, useRef } from 'react';
import { countryCoordinates } from '../data/countryCoordinates';
import type { Theme } from '../App';

declare const L: any;

interface GeographicDistributionMapProps {
    data: Record<string, number>;
    selectedCountry: string | null;
    onSelectCountry: (countryCode: string | null) => void;
    theme: Theme;
}

const GeographicDistributionMap: React.FC<GeographicDistributionMapProps> = ({ data, selectedCountry, onSelectCountry, theme }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const layerGroupRef = useRef<any>(null);

    const isDarkMode = theme === 'dark';

    // Effect to initialize map ONCE on mount
    useEffect(() => {
        if (typeof L === 'undefined' || !mapContainerRef.current) return;

        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                center: [20, 10],
                zoom: 2,
                scrollWheelZoom: false,
                zoomControl: false,
            });
            layerGroupRef.current = L.layerGroup().addTo(mapRef.current);
            
            // Invalidate size after a short delay to fix potential rendering glitches in SPAs
            setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 100);
        }

        // Cleanup on component unmount
        return () => {
            if (mapRef.current) {
                if (mapRef.current.getContainer()) {
                    mapRef.current.remove();
                }
                mapRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only once

    // Effect to update TILE LAYER on theme change
    useEffect(() => {
        if (!mapRef.current) return;
        
        const tileUrl = isDarkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        
        const newTileLayer = L.tileLayer(tileUrl, {
            attribution: isDarkMode
                ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            subdomains: 'abcd',
            maxZoom: 10,
            minZoom: 2,
        });

        // Remove old layer if it exists
        if (tileLayerRef.current) {
            mapRef.current.removeLayer(tileLayerRef.current);
        }

        // Add new layer and store its reference
        newTileLayer.addTo(mapRef.current);
        tileLayerRef.current = newTileLayer;

    }, [isDarkMode]);

    // Effect to update CIRCLES on data/selection change
    useEffect(() => {
        if (!mapRef.current || !layerGroupRef.current) return;

        layerGroupRef.current.clearLayers();

        // FIX: Argument of type 'unknown' is not assignable to parameter of type 'number'.
        const maxListeners = Object.values(data).reduce((max, val) => Math.max(max, Number(val) || 0), 1);

        Object.entries(data).forEach(([code, count]) => {
            const coords = countryCoordinates[code];
            if (!coords) return;

            // FIX: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
            const numericCount = Number(count) || 0;
            const radius = Math.max(50000, Math.sqrt(numericCount / maxListeners) * 1000000);
            const isSelected = selectedCountry === code;

            const circle = L.circle([coords.lat, coords.lng], {
                radius,
                color: isSelected ? '#FBBF24' : '#1a73e8',
                weight: isSelected ? 3 : 1.5,
                fillColor: '#1a73e8',
                fillOpacity: 0.5,
            });

            circle.bindTooltip(`${coords.name}: ${numericCount.toLocaleString()} listeners`);
            circle.on('click', () => {
                onSelectCountry(selectedCountry === code ? null : code);
            });

            layerGroupRef.current.addLayer(circle);
        });

    }, [data, selectedCountry, onSelectCountry]);

    return <div ref={mapContainerRef} style={{ height: '350px', borderRadius: '8px', backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb' }} />;
};

export default GeographicDistributionMap;
