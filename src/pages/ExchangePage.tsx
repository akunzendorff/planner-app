import { useState, useMemo, useEffect, useRef } from "react";
import { format, differenceInDays, parseISO, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, X, Pencil, Check, ChevronLeft, ChevronRight,
  MapPin, Plane, Train, Bus, Hotel, Camera, UtensilsCrossed, Clock,
  Wallet, Globe, Trash2, Eye, EyeOff,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useExchange } from "../features/exchange/store";
import { PLACE_CFG, ITEM_CFG, EX_CAT_CFG, formatFX } from "../features/exchange/utils";
import type { WishlistPlace, PlaceType, ItineraryItem, ItemType, ExTx, ExCat, ExConfig } from "../features/exchange/types";

type ExTab = "roteiro" | "lugares" | "financas";

const ITEM_TYPES: ItemType[]  = ["flight", "train", "bus", "accommodation", "activity", "restaurant", "museum", "other"];
const PLACE_TYPES: PlaceType[] = ["attraction", "restaurant", "museum", "park", "shopping", "hotel", "other"];
const EX_CATS: ExCat[]        = ["alimentacao", "transporte", "hospedagem", "lazer", "compras", "outros"];

function itemIcon(type: ItemType, size = 16) {
  const props = { size, className: "flex-shrink-0" };
  switch (type) {
    case "flight":        return <Plane {...props} />;
    case "train":         return <Train {...props} />;
    case "bus":           return <Bus {...props} />;
    case "accommodation": return <Hotel {...props} />;
    case "restaurant":    return <UtensilsCrossed {...props} />;
    case "museum":        return <Camera {...props} />;
    default:              return <MapPin {...props} />;
  }
}

interface MapViewProps {
  places: WishlistPlace[];
  dayPlaces: WishlistPlace[]; // places scheduled for the selected day
  onMapClick?: (lat: number, lng: number) => void;
  pickingMode?: boolean;
}

function MapView({ places, dayPlaces, onMapClick, pickingMode }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Dynamic import to avoid SSR
    import("leaflet").then(L => {
      // Fix default icon URLs
      const DefaultIcon = L.Icon.Default as any;
      delete DefaultIcon.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([48.8566, 2.3522], 13);
      leafletMap.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (onMapClick) {
        map.on("click", (e: any) => onMapClick(e.latlng.lat, e.latlng.lng));
      }
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when places change
  useEffect(() => {
    if (!leafletMap.current) return;
    import("leaflet").then(L => {
      // Remove old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      polylinesRef.current.forEach(p => p.remove());
      polylinesRef.current = [];

      const validPlaces = places.filter(p => p.lat !== undefined && p.lng !== undefined);
      validPlaces.forEach(place => {
        const cfg = PLACE_CFG[place.type];
        const isDayPlace = dayPlaces.some(d => d.id === place.id);

        const icon = L.divIcon({
          html: `<div style="
            background:${isDayPlace ? cfg.color : place.visited ? "#9CA3AF" : cfg.color};
            width:${isDayPlace ? 36 : 28}px;height:${isDayPlace ? 36 : 28}px;
            border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            opacity:${place.visited && !isDayPlace ? 0.6 : 1};
          ">
            <span style="transform:rotate(45deg);font-size:${isDayPlace ? 16 : 12}px">${cfg.emoji}</span>
          </div>`,
          className: "",
          iconSize: [isDayPlace ? 36 : 28, isDayPlace ? 36 : 28],
          iconAnchor: [isDayPlace ? 18 : 14, isDayPlace ? 36 : 28],
        });

        const marker = L.marker([place.lat!, place.lng!], { icon })
          .addTo(leafletMap.current)
          .bindPopup(`<strong>${place.name}</strong><br>${cfg.label}${place.notes ? `<br><em>${place.notes}</em>` : ""}`);
        markersRef.current.push(marker);
      });

      // Draw route polyline for day places (in order)
      if (dayPlaces.length >= 2) {
        const coords = dayPlaces
          .filter(p => p.lat !== undefined && p.lng !== undefined)
          .map(p => [p.lat!, p.lng!] as [number, number]);

        if (coords.length >= 2) {
          const polyline = L.polyline(coords, {
            color: "#C4581B",
            weight: 3,
            opacity: 0.7,
            dashArray: "8, 6",
          }).addTo(leafletMap.current);
          polylinesRef.current.push(polyline);
        }
      }

      // Fit bounds to all markers if there are any
      if (validPlaces.length > 0) {
        const group = L.featureGroup(markersRef.current);
        leafletMap.current.fitBounds(group.getBounds().pad(0.15));
      }
    });
  }, [places, dayPlaces]);

  return (
    <div className="relative w-full h-full">
      {pickingMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-foreground text-background text-xs px-3 py-1.5 rounded-full shadow-lg">
          Clique no mapa para definir a localização
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-xl" style={{ minHeight: 400 }} />
      <style>{`
        .leaflet-container { font-family: 'DM Sans', sans-serif; border-radius: 0.75rem; }
        .leaflet-popup-content-wrapper { border-radius: 0.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
        .leaflet-popup-content { font-size: 13px; line-height: 1.5; }
      `}</style>
    </div>
  );
}

function RoteirTab() {
  const { items, addItem, updateItem, deleteItem } = useExchange();
  const [modal, setModal] = useState<{ mode: "closed" } | { mode: "add"; date?: string } | { mode: "edit"; item: ItineraryItem }>({ mode: "closed" });

  const grouped = useMemo(() => {
    const map = new Map<string, ItineraryItem[]>();
    [...items]
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return (a.startTime ?? "00:00").localeCompare(b.startTime ?? "00:00");
      })
      .forEach(item => {
        if (!map.has(item.date)) map.set(item.date, []);
        map.get(item.date)!.push(item);
      });
    return map;
  }, [items]);

  const handleSave = (data: Omit<ItineraryItem, "id">) => {
    if (modal.mode === "add") addItem(data);
    else if (modal.mode === "edit") updateItem(modal.item.id, data);
    setModal({ mode: "closed" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{items.length} itens no roteiro</p>
        <button onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {grouped.size === 0 && (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl">
          <Plane size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum item no roteiro ainda.</p>
        </div>
      )}

      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([date, dayItems]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-foreground text-background text-xs font-medium px-3 py-1 rounded-full capitalize" style={{ fontFamily: "'DM Mono', monospace" }}>
                {format(parseISO(date), "EEE, d MMM yyyy", { locale: ptBR })}
              </div>
              <div className="flex-1 h-px bg-border" />
              <button onClick={() => setModal({ mode: "add", date })}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-secondary hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Plus size={11} />
              </button>
            </div>

            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

              <div className="space-y-3">
                {dayItems.map(item => {
                  const cfg = ITEM_CFG[item.type];
                  return (
                    <div key={item.id} className="group relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-5 top-4 w-3 h-3 rounded-full border-2 border-background"
                        style={{ backgroundColor: cfg.color }} />

                      <div className={`bg-card border rounded-xl p-4 hover:border-border/70 transition-all ${item.confirmed ? "border-border" : "border-dashed border-border"}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: cfg.color + "20", color: cfg.color }}>
                            {itemIcon(item.type, 16)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm leading-snug">{item.title}</p>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {!item.confirmed && (
                                  <button onClick={() => updateItem(item.id, { ...item, confirmed: true })}
                                    className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Confirmar">
                                    <Check size={12} />
                                  </button>
                                )}
                                <button onClick={() => setModal({ mode: "edit", item })}
                                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => deleteItem(item.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {item.startTime && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                                  <Clock size={10} />{item.startTime}{item.endTime ? ` → ${item.endTime}` : ""}
                                </span>
                              )}
                              {item.location && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin size={10} />{item.location}
                                </span>
                              )}
                              {!item.confirmed && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">a confirmar</span>
                              )}
                            </div>
                            {item.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">{item.notes}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal.mode !== "closed" && (
        <ItemModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.item : { date: (modal as any).date }}
          onSave={handleSave}
          onDelete={modal.mode === "edit" ? () => { deleteItem(modal.item.id); setModal({ mode: "closed" }); } : undefined}
          onClose={() => setModal({ mode: "closed" })}
        />
      )}
    </div>
  );
}

function LugaresTab() {
  const { places, items, addPlace, updatePlace, deletePlace, addItem, updateItem } = useExchange();
  const [selectedDate, setSelectedDate] = useState("2026-08-03");
  const [filter, setFilter] = useState<"all" | "visited" | "unvisited">("all");
  const [placeModal, setPlaceModal] = useState<{ mode: "closed" } | { mode: "add" } | { mode: "edit"; place: WishlistPlace }>({ mode: "closed" });
  const [pickingFor, setPickingFor] = useState<string | null>(null); // placeId being positioned on map
  const [addToDay, setAddToDay] = useState<WishlistPlace | null>(null);
  const [dayTime, setDayTime] = useState("10:00");
  const [dayEndTime, setDayEndTime] = useState("12:00");

  const filteredPlaces = places.filter(p => {
    if (filter === "visited") return p.visited;
    if (filter === "unvisited") return !p.visited;
    return true;
  });

  // Items for the selected day that have a placeId
  const dayItems = useMemo(() =>
    items
      .filter(i => i.date === selectedDate && i.placeId)
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    [items, selectedDate],
  );

  const dayPlaces = useMemo(() =>
    dayItems.map(i => places.find(p => p.id === i.placeId)).filter(Boolean) as WishlistPlace[],
    [dayItems, places],
  );

  const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8..22

  const handleMapClick = (lat: number, lng: number) => {
    if (pickingFor) {
      const place = places.find(p => p.id === pickingFor);
      if (place) updatePlace(pickingFor, { ...place, lat, lng });
      setPickingFor(null);
    }
  };

  const handleAddToDay = () => {
    if (!addToDay) return;
    addItem({
      type: "activity",
      title: addToDay.name,
      date: selectedDate,
      startTime: dayTime,
      endTime: dayEndTime,
      placeId: addToDay.id,
      location: "",
      notes: "",
      confirmed: false,
    });
    setAddToDay(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6" style={{ minHeight: 600 }}>
      {/* Left: list + day planner */}
      <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "80vh" }}>
        {/* Filter + add */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-1">
            {(["all","unvisited","visited"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${filter === f ? "bg-card text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                {f === "all" ? "Todos" : f === "visited" ? "Visitados" : "Por visitar"}
              </button>
            ))}
          </div>
          <button onClick={() => setPlaceModal({ mode: "add" })}
            className="ml-auto flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
            <Plus size={13} /> Lugar
          </button>
        </div>

        {/* Places list */}
        <div className="space-y-2">
          {filteredPlaces.map(place => {
            const cfg = PLACE_CFG[place.type];
            const isInDay = dayItems.some(i => i.placeId === place.id);
            return (
              <div key={place.id} className={`group bg-card border rounded-xl p-3 transition-all ${isInDay ? "border-accent/40 bg-accent/5" : "border-border hover:border-border/70"}`}>
                <div className="flex items-start gap-2.5">
                  <button onClick={() => updatePlace(place.id, { ...place, visited: !place.visited })}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${place.visited ? "border-transparent" : "border-border hover:border-foreground/40"}`}
                    style={{ backgroundColor: place.visited ? cfg.color : "transparent" }}>
                    {place.visited && <Check size={10} className="text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{cfg.emoji}</span>
                      <p className={`text-sm font-medium truncate ${place.visited ? "line-through text-muted-foreground" : ""}`}>{place.name}</p>
                    </div>
                    {place.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{place.notes}</p>}
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setAddToDay(place)}
                      title="Adicionar ao dia"
                      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors">
                      <Clock size={11} />
                    </button>
                    <button onClick={() => setPickingFor(pickingFor === place.id ? null : place.id)}
                      title="Definir no mapa"
                      className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${pickingFor === place.id ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-accent hover:bg-accent/10"}`}>
                      <MapPin size={11} />
                    </button>
                    <button onClick={() => setPlaceModal({ mode: "edit", place })}
                      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredPlaces.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lugar aqui.</p>
          )}
        </div>

        {/* Day planner */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>Planejamento do dia</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"))}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors text-muted-foreground">
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-medium capitalize px-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                {format(parseISO(selectedDate), "d MMM", { locale: ptBR })}
              </span>
              <button onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd"))}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors text-muted-foreground">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Time grid */}
          <div className="relative border border-border rounded-xl overflow-hidden bg-card">
            {HOURS.map(hour => {
              const timeStr = `${String(hour).padStart(2, "0")}:00`;
              const item = dayItems.find(i => i.startTime && parseInt(i.startTime) === hour);
              return (
                <div key={hour} className="flex border-b border-border/50 last:border-0" style={{ minHeight: 36 }}>
                  <div className="w-12 flex-shrink-0 text-right pr-2 py-1.5 border-r border-border/50">
                    <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{timeStr}</span>
                  </div>
                  <div className="flex-1 px-2 py-1.5 relative">
                    {item && (() => {
                      const place = item.placeId ? places.find(p => p.id === item.placeId) : null;
                      const cfg = place ? PLACE_CFG[place.type] : null;
                      return (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-white text-xs font-medium"
                          style={{ backgroundColor: cfg?.color ?? "#C4581B" }}>
                          {place && <span>{cfg?.emoji}</span>}
                          <span className="truncate">{item.title}</span>
                          {item.endTime && <span className="opacity-70 ml-auto flex-shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>→{item.endTime}</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Map */}
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ minHeight: 500 }}>
        <MapView
          places={places}
          dayPlaces={dayPlaces}
          onMapClick={pickingFor ? handleMapClick : undefined}
          pickingMode={!!pickingFor}
        />
        {dayPlaces.length >= 2 && (
          <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span style={{ color: "#C4581B" }}>— — —</span>
              rota do dia ({dayPlaces.length} paradas)
            </span>
          </div>
        )}
      </div>

      {/* Add to day modal */}
      {addToDay && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setAddToDay(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xs p-6">
            <h3 className="text-lg font-medium mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Adicionar ao dia
            </h3>
            <p className="text-sm font-medium mb-4">{PLACE_CFG[addToDay.type].emoji} {addToDay.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Data</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Início</label>
                  <input type="time" value={dayTime} onChange={e => setDayTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Fim</label>
                  <input type="time" value={dayEndTime} onChange={e => setDayEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
                </div>
              </div>
              <div className="flex gap-2 pt-1 justify-end">
                <button onClick={() => setAddToDay(null)} className="px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">Cancelar</button>
                <button onClick={handleAddToDay} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 transition-all">Adicionar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Place modal */}
      {placeModal.mode !== "closed" && (
        <PlaceModal
          mode={placeModal.mode}
          initial={placeModal.mode === "edit" ? placeModal.place : undefined}
          onSave={data => {
            if (placeModal.mode === "add") addPlace(data);
            else updatePlace(placeModal.place.id, data);
            setPlaceModal({ mode: "closed" });
          }}
          onDelete={placeModal.mode === "edit" ? () => { deletePlace(placeModal.place.id); setPlaceModal({ mode: "closed" }); } : undefined}
          onClose={() => setPlaceModal({ mode: "closed" })}
        />
      )}
    </div>
  );
}

function FinancasTab() {
  const { config, setConfig, txs, addTx, updateTx, deleteTx } = useExchange();
  const [txModal, setTxModal] = useState<{ mode: "closed" } | { mode: "add" } | { mode: "edit"; tx: ExTx }>({ mode: "closed" });
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(config.exchangeRate));

  const totalSpent = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalSpent;
  const remaining = config.budget + net;
  const pct = Math.min((totalSpent / config.budget) * 100, 100);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    txs.filter(t => t.type === "expense").forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return map;
  }, [txs]);

  const handleSaveTx = (data: Omit<ExTx, "id">) => {
    if (txModal.mode === "add") addTx(data);
    else if (txModal.mode === "edit") updateTx(txModal.tx.id, data);
    setTxModal({ mode: "closed" });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* Left: transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>Movimentações</h2>
          <button onClick={() => setTxModal({ mode: "add" })}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
            <Plus size={13} /> Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {[...txs].sort((a, b) => b.date.localeCompare(a.date)).map(tx => {
            const cat = EX_CAT_CFG[tx.category];
            return (
              <div key={tx.id} onClick={() => setTxModal({ mode: "edit", tx })}
                className="group flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-border/70 transition-all cursor-pointer">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {format(parseISO(tx.date), "d MMM", { locale: ptBR })} · {cat.label}
                  </p>
                </div>
                <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${tx.type === "income" ? "text-emerald-600" : ""}`}
                  style={{ fontFamily: "'DM Mono', monospace", color: tx.type === "expense" ? cat.color : undefined }}>
                  {tx.type === "income" ? "+" : ""}{formatFX(tx.amount, config.currencySymbol)}
                </span>
                <Pencil size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: summary */}
      <div className="space-y-4">
        {/* Budget */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">Orçamento</p>
            <span className="text-sm font-bold tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
              {formatFX(config.budget, config.currencySymbol)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: pct > 90 ? "#C4581B" : pct > 70 ? "#C4911B" : "#2C7A4B" }} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
            <span>gasto: {formatFX(totalSpent, config.currencySymbol)}</span>
            <span className={remaining < 0 ? "text-destructive font-medium" : "text-emerald-600 font-medium"}>
              restante: {formatFX(remaining, config.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Exchange rate */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">Câmbio</p>
            <button onClick={() => { setEditingRate(true); setRateInput(String(config.exchangeRate)); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              editar
            </button>
          </div>
          {editingRate ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm">{config.currencySymbol} 1 =</span>
              <input type="number" value={rateInput} onChange={e => setRateInput(e.target.value)}
                className="w-20 px-2 py-1 text-sm rounded bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
              <span className="text-sm">R$</span>
              <button onClick={() => { setConfig({ ...config, exchangeRate: parseFloat(rateInput) || config.exchangeRate }); setEditingRate(false); }}
                className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">ok</button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm mt-1">
              {config.currencySymbol} 1 = <strong>R$ {config.exchangeRate.toFixed(2).replace(".", ",")}</strong>
              <span className="text-xs ml-2">(total: R$ {(totalSpent * config.exchangeRate).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")})</span>
            </p>
          )}
        </div>

        {/* By category */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>Por categoria</p>
          </div>
          {EX_CATS.map(cat => {
            const amount = byCategory[cat] ?? 0;
            const catPct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
            const cfg = EX_CAT_CFG[cat];
            return (
              <div key={cat} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="text-sm flex-1">{cfg.label}</span>
                <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${catPct}%`, backgroundColor: cfg.color }} />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground w-16 text-right" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {formatFX(amount, config.currencySymbol)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tx modal */}
      {txModal.mode !== "closed" && (
        <TxModalEx
          mode={txModal.mode}
          initial={txModal.mode === "edit" ? txModal.tx : undefined}
          symbol={config.currencySymbol}
          onSave={handleSaveTx}
          onDelete={txModal.mode === "edit" ? () => { deleteTx(txModal.tx.id); setTxModal({ mode: "closed" }); } : undefined}
          onClose={() => setTxModal({ mode: "closed" })}
        />
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

import type React from "react";

function Actions({ onClose, onDelete, saveLabel = "Salvar" }: { onClose: () => void; onDelete?: () => void; saveLabel?: string }) {
  return (
    <div className={`flex gap-2 pt-2 ${onDelete ? "justify-between" : "justify-end"}`}>
      {onDelete && <button onClick={onDelete} className="px-3 py-2.5 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors">Excluir</button>}
      <div className="flex gap-2">
        <button onClick={onClose} className="px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">Cancelar</button>
        <button type="submit" form="modal-form" className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 transition-all">{saveLabel}</button>
      </div>
    </div>
  );
}

function ItemModal({ mode, initial, onSave, onDelete, onClose }: {
  mode: "add" | "edit";
  initial?: Partial<ItineraryItem>;
  onSave: (d: Omit<ItineraryItem, "id">) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [type, setType]         = useState<ItemType>(initial?.type ?? "activity");
  const [title, setTitle]       = useState(initial?.title ?? "");
  const [date, setDate]         = useState(initial?.date ?? "2026-08-03");
  const [startTime, setStart]   = useState(initial?.startTime ?? "");
  const [endTime, setEnd]       = useState(initial?.endTime ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes]       = useState(initial?.notes ?? "");
  const [confirmed, setConf]    = useState(initial?.confirmed ?? false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ type, title: title.trim(), date, startTime: startTime || undefined, endTime: endTime || undefined, location, notes, confirmed, placeId: initial?.placeId });
  };

  return (
    <ModalShell title={mode === "add" ? "Novo item" : "Editar item"} onClose={onClose}>
      <form id="modal-form" onSubmit={submit} className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {ITEM_TYPES.map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-all ${type === t ? "text-white border-transparent font-medium" : "border-border text-muted-foreground hover:text-foreground"}`}
              style={type === t ? { backgroundColor: ITEM_CFG[t].color } : {}}>
              <span>{ITEM_CFG[t].emoji}</span>{ITEM_CFG[t].label}
            </button>
          ))}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="Título"
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30" />
        <div className="grid grid-cols-3 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="col-span-1 px-2 py-2.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
          <input type="time" value={startTime} onChange={e => setStart(e.target.value)} placeholder="início"
            className="px-2 py-2.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
          <input type="time" value={endTime} onChange={e => setEnd(e.target.value)} placeholder="fim"
            className="px-2 py-2.5 text-xs rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
        </div>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Local (opcional)"
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none" />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas (opcional)" rows={2}
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none resize-none" />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConf(e.target.checked)} className="rounded" />
          Confirmado
        </label>
        <Actions onClose={onClose} onDelete={onDelete} saveLabel={mode === "add" ? "Adicionar" : "Salvar"} />
      </form>
    </ModalShell>
  );
}

function PlaceModal({ mode, initial, onSave, onDelete, onClose }: {
  mode: "add" | "edit";
  initial?: WishlistPlace;
  onSave: (d: Omit<WishlistPlace, "id">) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [type, setType]   = useState<PlaceType>(initial?.type ?? "attraction");
  const [name, setName]   = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [visited, setVis] = useState(initial?.visited ?? false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ type, name: name.trim(), notes, visited, lat: initial?.lat, lng: initial?.lng });
  };

  return (
    <ModalShell title={mode === "add" ? "Novo lugar" : "Editar lugar"} onClose={onClose}>
      <form id="modal-form" onSubmit={submit} className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {PLACE_TYPES.map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-all ${type === t ? "text-white border-transparent font-medium" : "border-border text-muted-foreground hover:text-foreground"}`}
              style={type === t ? { backgroundColor: PLACE_CFG[t].color } : {}}>
              <span>{PLACE_CFG[t].emoji}</span>{PLACE_CFG[t].label}
            </button>
          ))}
        </div>
        <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Nome do lugar"
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30" />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas (opcional)" rows={2}
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none resize-none" />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={visited} onChange={e => setVis(e.target.checked)} className="rounded" />
          Já visitei
        </label>
        <Actions onClose={onClose} onDelete={onDelete} saveLabel={mode === "add" ? "Adicionar" : "Salvar"} />
      </form>
    </ModalShell>
  );
}

function TxModalEx({ mode, initial, symbol, onSave, onDelete, onClose }: {
  mode: "add" | "edit";
  initial?: ExTx;
  symbol: string;
  onSave: (d: Omit<ExTx, "id">) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [type, setType]         = useState<"expense" | "income">(initial?.type ?? "expense");
  const [cat, setCat]           = useState<ExCat>(initial?.category ?? "alimentacao");
  const [desc, setDesc]         = useState(initial?.description ?? "");
  const [amount, setAmount]     = useState(initial ? String(initial.amount) : "");
  const [date, setDate]         = useState(initial?.date ?? "2026-08-03");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount.replace(",", "."));
    if (!desc.trim() || isNaN(n)) return;
    onSave({ type, category: cat, description: desc.trim(), amount: n, date });
  };

  return (
    <ModalShell title={mode === "add" ? "Nova movimentação" : "Editar"} onClose={onClose}>
      <form id="modal-form" onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          {(["expense","income"] as const).map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex-1 py-2 text-sm rounded-lg border transition-all ${type === t ? (t === "expense" ? "bg-destructive/10 border-destructive text-destructive font-medium" : "bg-emerald-50 border-emerald-500 text-emerald-700 font-medium") : "border-border text-muted-foreground hover:text-foreground"}`}>
              {t === "expense" ? "Gasto" : "Entrada"}
            </button>
          ))}
        </div>
        <input value={desc} onChange={e => setDesc(e.target.value)} required autoFocus placeholder="Descrição"
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30" />
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span>
            <input value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0,00"
              className="w-full pl-7 pr-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
        </div>
        <select value={cat} onChange={e => setCat(e.target.value as ExCat)}
          className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none">
          {EX_CATS.map(c => <option key={c} value={c}>{EX_CAT_CFG[c].label}</option>)}
        </select>
        <Actions onClose={onClose} onDelete={onDelete} saveLabel={mode === "add" ? "Adicionar" : "Salvar"} />
      </form>
    </ModalShell>
  );
}

export default function ExchangePage() {
  const { config, places, items } = useExchange();
  const [tab, setTab] = useState<ExTab>("roteiro");

  const today = new Date(2026, 6, 2);
  const start = parseISO(config.startDate);
  const end   = parseISO(config.endDate);
  const daysToGo  = differenceInDays(start, today);
  const totalDays = differenceInDays(end, start);
  const visitedCount = places.filter(p => p.visited).length;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-card border border-border rounded-2xl p-5 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ background: "radial-gradient(ellipse at top right, #3B6FA0 0%, transparent 70%)" }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe size={16} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>Intercâmbio</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {config.city}, {config.country}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {format(start, "d MMM yyyy", { locale: ptBR })} → {format(end, "d MMM yyyy", { locale: ptBR })} · {totalDays} dias
            </p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>{daysToGo > 0 ? daysToGo : 0}</p>
              <p className="text-xs text-muted-foreground">{daysToGo > 0 ? "dias para embarcar" : "em viagem"}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>{items.length}</p>
              <p className="text-xs text-muted-foreground">itens no roteiro</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>{visitedCount}/{places.length}</p>
              <p className="text-xs text-muted-foreground">lugares visitados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-1 mb-6 w-fit">
        {([["roteiro","Roteiro"],["lugares","Lugares"],["financas","Finanças"]] as [ExTab,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-4 py-1.5 text-xs rounded-md transition-all ${tab === v ? "bg-card text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "roteiro"  && <RoteirTab />}
      {tab === "lugares"  && <LugaresTab />}
      {tab === "financas" && <FinancasTab />}
    </main>
  );
}
