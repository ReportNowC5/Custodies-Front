"use client"

import { useState } from "react"
import { CircleMarker, FeatureGroup, LayerGroup, MapContainer, Popup, Rectangle, TileLayer } from "react-leaflet"

import { useThemeStore } from "@/store";
import { useTheme } from "next-themes";
import { themes } from "@/config/thems";

const rectangle: [number, number][] = [
    [51.49, -0.08],
    [51.5, -0.06],
]

interface MapState {
    lat: number;
    lng: number;
    zoom: number;
}
const LayerGroupMap = ({ height = 350 }: { height?: number }) => {

    const { theme: config, setTheme: setConfig } = useThemeStore();
    const { theme: mode } = useTheme();
    const theme = themes.find((theme) => theme.name === config);

    const [state, setState] = useState<MapState>({ lat: 51.505, lng: -0.09, zoom: 13 })
    const position: [number, number] = [state.lat, state.lng];

    return (
        <MapContainer
            center={position}
            zoom={state.zoom}
            style={{ height: height }}
        >
            <TileLayer
                attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LayerGroup>
                <CircleMarker center={position} radius={200} pathOptions={{ fillColor: "blue" }} />
                <CircleMarker
                    center={position}
                    radius={200}
                    pathOptions={{ fillColor: `hsla(${theme?.cssVars[mode === "dark" ? "dark" : "light"].primary})` }}
                />
                <LayerGroup>
                    <CircleMarker
                        center={[51.51, -0.08]}
                        radius={200}
                        pathOptions={{ fillColor: `hsla(${theme?.cssVars[mode === "dark" ? "dark" : "light"].warning})` }}
                    />
                </LayerGroup>
            </LayerGroup>
            <FeatureGroup
             pathOptions={{ fillColor: `hsla(${theme?.cssVars[mode === "dark" ? "dark" : "light"].info})` }}
            >
                <Popup>Popup in FeatureGroup</Popup>
                <CircleMarker center={[51.51, -0.06]} radius={200} />
                <Rectangle bounds={rectangle} />
            </FeatureGroup>
        </MapContainer>
    )

}

export default LayerGroupMap;