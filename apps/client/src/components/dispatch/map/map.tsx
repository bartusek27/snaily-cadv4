import * as React from "react";
import { CRS } from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";
import { getMapBounds } from "lib/map/utils";
import { RenderMapBlips } from "./render-map-blips";
import { RenderActiveCalls } from "./calls/render-active-map-calls";
import { MapActions } from "./map-actions";
import { RenderMapPlayers } from "./units/render-map-players";
import { SelectMapServerModal } from "./modals/select-map-server-modal";

const TILES_URL = "/tiles/minimap_sea_{y}_{x}.webp" as const;

export function Map() {
  const [map, setMap] = React.useState<L.Map | undefined>();
  const bounds = React.useMemo(() => (map ? getMapBounds(map) : undefined), [map]);

  React.useEffect(() => {
    if (bounds) {
      map?.setMaxBounds(bounds);
      map?.fitBounds(bounds);
      map?.setZoom(-2);
      map?.getBounds();
    }
  }, [bounds, map]);

  return (
    <MapContainer
      ref={(map) => {
        map && setMap(map);
      }}
      style={{ zIndex: 1, height: "calc(100vh - 3.5rem)", width: "100%" }}
      crs={CRS.Simple}
      center={[0, 0]}
      zoom={-2}
      bounds={bounds}
      zoomControl={false}
    >
      <TileLayer
        url={TILES_URL}
        minZoom={-2}
        maxZoom={2}
        tileSize={1024}
        maxNativeZoom={0}
        minNativeZoom={0}
      />

      <RenderMapPlayers />
      <RenderMapBlips />
      <RenderActiveCalls />
      <MapActions />

      <SelectMapServerModal />
    </MapContainer>
  );
}
