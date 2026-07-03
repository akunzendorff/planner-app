import { useState, useMemo, useEffect, useRef } from "react";
import { format, differenceInDays, parseISO, addDays, subDays, addMonths, subMonths, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, X, Pencil, Check, ChevronLeft, ChevronRight,
  MapPin, Plane, Train, Bus, Hotel, Camera, UtensilsCrossed, Clock,
  Wallet, Globe, Trash2, Eye, EyeOff, AlertTriangle,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useExchange } from "../features/exchange/store";
import { PLACE_CFG, ITEM_CFG, EX_CAT_CFG, EX_TX_CFG, formatFX } from "../features/exchange/utils";
import type { WishlistPlace, PlaceType, ItineraryItem, ItemType, ExTx, ExCat, ExConfig, ExTxType, ExRecType } from "../features/exchange/types";

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
  const clickHandlerRef = useRef(onMapClick);
  clickHandlerRef.current = onMapClick;

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

      map.on("click", (e: any) => clickHandlerRef.current?.(e.latlng.lat, e.latlng.lng));
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
        .leaflet-container { font-family: 'Inter', sans-serif; border-radius: 0.75rem; }
        .leaflet-popup-content-wrapper { border-radius: 0.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
        .leaflet-popup-content { font-size: 13px; line-height: 1.5; }
      `}</style>
    </div>
  );
}

function RoteirTab() {
  const { config, items, addItem, updateItem, deleteItem } = useExchange();
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
          defaultDate={config.startDate}
          onSave={handleSave}
          onDelete={modal.mode === "edit" ? () => { deleteItem(modal.item.id); setModal({ mode: "closed" }); } : undefined}
          onClose={() => setModal({ mode: "closed" })}
        />
      )}
    </div>
  );
}

function LugaresTab() {
  const { config, places, items, addPlace, updatePlace, deletePlace, addItem, updateItem } = useExchange();
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    if (!config.startDate) return;
    if (!selectedDate || selectedDate < config.startDate || (config.endDate && selectedDate > config.endDate)) {
      setSelectedDate(config.startDate);
    }
  }, [config.startDate, config.endDate]);
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
              <button onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate || config.startDate), 1), "yyyy-MM-dd"))}
                disabled={!selectedDate || !config.startDate || selectedDate <= config.startDate}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed">
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-medium capitalize px-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                {selectedDate ? format(parseISO(selectedDate), "d MMM", { locale: ptBR }) : "—"}
              </span>
              <button onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate || config.startDate), 1), "yyyy-MM-dd"))}
                disabled={!selectedDate || !config.endDate || selectedDate >= config.endDate}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed">
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
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setAddToDay(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xs p-6">
            <h3 className="text-lg font-medium mb-4">
              Adicionar ao dia
            </h3>
            <p className="text-sm font-medium mb-4">{PLACE_CFG[addToDay.type].emoji} {addToDay.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Data</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  min={config.startDate || undefined} max={config.endDate || undefined}
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

function ExDayRow({ day, dateStr, txs, saldo, symbol, onAdd, onEdit }: {
  day: number; dateStr: string; txs: ExTx[]; saldo: number; symbol: string;
  onAdd: (date: string) => void; onEdit: (tx: ExTx) => void;
}) {
  const weekDay = format(parseISO(dateStr + "T12:00:00"), "EEE", { locale: ptBR });
  const isEmpty = txs.length === 0;

  return (
    <div className={`flex items-stretch border-b border-border group transition-colors hover:bg-secondary/20 ${isEmpty ? "opacity-50" : ""}`}>
      <div className="w-14 flex-shrink-0 flex flex-col items-center justify-start pt-3 pb-2 border-r border-border">
        <span className="text-sm font-medium leading-none">{String(day).padStart(2, "0")}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5 uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>{weekDay}</span>
      </div>
      <div className="flex-1 py-1 min-w-0">
        {isEmpty ? (
          <div className="px-3 py-2 text-xs text-muted-foreground/50 italic">—</div>
        ) : (
          txs.map((tx, i) => {
            const tcfg = EX_TX_CFG[tx.type];
            const cat = tx.type === "entrada" ? null : EX_CAT_CFG[tx.category];
            return (
              <div key={tx.id ?? i}
                onClick={() => onEdit(tx)}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-secondary/40 rounded-md mx-1 transition-colors">
                <span className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0 text-[8px]"
                  style={{ width: 20, height: 20, backgroundColor: tcfg.color }}>
                  {tcfg.letter}
                </span>
                <span className="text-sm flex-1 truncate">{tx.description}</span>
                {cat && <span className="text-[10px] text-muted-foreground hidden sm:inline">{cat.label}</span>}
                <span className={`text-sm flex-shrink-0 tabular-nums ${tx.type === "entrada" ? "text-emerald-600" : ""}`}
                  style={{ fontFamily: "'DM Mono', monospace", color: tx.type === "entrada" ? undefined : tcfg.color }}>
                  {tx.type === "entrada" ? "+" : ""}{formatFX(tx.amount, symbol)}
                </span>
              </div>
            );
          })
        )}
        <button onClick={() => onAdd(dateStr)}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
          <Plus size={11} /> adicionar
        </button>
      </div>
      <div className={`w-28 sm:w-36 flex-shrink-0 flex items-center justify-end px-3 sm:px-4 text-sm font-medium tabular-nums ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}
        style={{ fontFamily: "'DM Mono', monospace" }}>
        {formatFX(saldo, symbol)}
      </div>
    </div>
  );
}

function FinancasTab() {
  const { config, setConfig, txs, addTx, updateTx, deleteTx } = useExchange();
  const MIN_DATE = new Date(2026, 8, 1); // setembro
  const MAX_DATE = new Date(2026, 9, 1); // outubro
  const [viewDate, setViewDate] = useState(() => new Date(2026, 8, 1));
  const [txModal, setTxModal] = useState<{ mode: "closed" } | { mode: "add"; prefillDate?: string } | { mode: "edit"; tx: ExTx }>({ mode: "closed" });
  const [deleteTarget, setDeleteTarget] = useState<ExTx | null>(null);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(config.exchangeRate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const initialBalance = useMemo(() =>
    txs
      .filter(tx => tx.date < monthPrefix)
      .reduce((s, tx) => s + (tx.type === "entrada" ? tx.amount : -tx.amount), 0),
    [txs, monthPrefix],
  );

  const monthTxs = useMemo(() =>
    txs.filter(tx => tx.date.startsWith(monthPrefix)),
    [txs, monthPrefix],
  );

  const dayData = useMemo(() => {
    const numDays = getDaysInMonth(viewDate);
    const result: { day: number; dateStr: string; txs: ExTx[]; dailyBalance: number }[] = [];
    let running = initialBalance;
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      const dayTxs = monthTxs.filter(tx => tx.date === dateStr);
      for (const tx of dayTxs) {
        running += tx.type === "entrada" ? tx.amount : -tx.amount;
      }
      result.push({ day: d, dateStr, txs: dayTxs, dailyBalance: running });
    }
    return result;
  }, [monthTxs, monthPrefix, viewDate, initialBalance]);

  const monthIncome = monthTxs.filter(t => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxs.filter(t => t.type === "saida" || t.type === "diario").reduce((s, t) => s + t.amount, 0);
  const monthBalance = monthIncome - monthExpense;
  const lastSaldo = dayData.length > 0 ? dayData[dayData.length - 1].dailyBalance : initialBalance;

  const totalSpent = txs.filter(t => t.type === "saida" || t.type === "diario").reduce((s, t) => s + t.amount, 0);
  const totalIncome = txs.filter(t => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalSpent;
  const remaining = config.budget + net;
  const budgetPct = Math.min((totalSpent / config.budget) * 100, 100);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    txs.filter(t => t.type === "saida" || t.type === "diario").forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return map;
  }, [txs]);

  const handleSaveTx = (data: Omit<ExTx, "id"> & { recType?: "none" | "daily" | "weekly" | "monthly"; recTotal?: number }) => {
    if (txModal.mode === "add") addTx(data);
    else if (txModal.mode === "edit") {
      const { recType, recTotal, ...rest } = data;
      updateTx(txModal.tx.id, rest);
    }
    setTxModal({ mode: "closed" });
  };

  return (
    <div className="space-y-6">
      {/* Month nav */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewDate(d => subMonths(d, 1))}
            disabled={viewDate <= MIN_DATE}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-20 disabled:cursor-not-allowed hover:bg-secondary text-muted-foreground hover:text-foreground">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-20 text-center capitalize" style={{ fontFamily: "'DM Mono', monospace" }}>
            {format(viewDate, "MMM/yy", { locale: ptBR })}
          </span>
          <button onClick={() => setViewDate(d => addMonths(d, 1))}
            disabled={addMonths(viewDate, 1) > MAX_DATE}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-20 disabled:cursor-not-allowed hover:bg-secondary text-muted-foreground hover:text-foreground">
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={() => setTxModal({ mode: "add" })}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-80 transition-opacity">
          <Plus size={14} /> Movimentação
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Receitas</p>
          <p className="text-sm font-semibold tabular-nums text-emerald-600" style={{ fontFamily: "'DM Mono', monospace" }}>
            {formatFX(monthIncome, config.currencySymbol)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Despesas</p>
          <p className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'DM Mono', monospace", color: "#C4581B" }}>
            {formatFX(monthExpense, config.currencySymbol)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Saldo acumulado</p>
          <p className={`text-sm font-semibold tabular-nums ${lastSaldo >= 0 ? "text-emerald-600" : "text-red-600"}`}
            style={{ fontFamily: "'DM Mono', monospace" }}>
            {formatFX(lastSaldo, config.currencySymbol)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Orçamento</p>
          <p className="text-sm font-semibold tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
            {formatFX(config.budget, config.currencySymbol)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Daily ledger */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border bg-secondary/40">
            <div className="w-14 flex-shrink-0 px-3 py-2 border-r border-border">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'DM Mono', monospace" }}>Dia</span>
            </div>
            <div className="flex-1 px-3 py-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'DM Mono', monospace" }}>Movimentações</span>
            </div>
            <div className="w-28 sm:w-36 flex-shrink-0 px-3 sm:px-4 py-2 text-right">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'DM Mono', monospace" }}>Saldo</span>
            </div>
          </div>
          <div className="divide-y-0">
            {dayData.map(d => (
              <ExDayRow
                key={d.day}
                day={d.day} dateStr={d.dateStr} txs={d.txs}
                saldo={d.dailyBalance}
                symbol={config.currencySymbol}
                onAdd={date => setTxModal({ mode: "add", prefillDate: date })}
                onEdit={tx => setTxModal({ mode: "edit", tx })}
              />
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Budget progress */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">Orçamento total</p>
              <span className="text-sm font-bold tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                {formatFX(config.budget, config.currencySymbol)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${budgetPct}%`, backgroundColor: budgetPct > 90 ? "#C4581B" : budgetPct > 70 ? "#C4911B" : "#2C7A4B" }} />
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
      </div>

      {/* Tx modal */}
      {txModal.mode !== "closed" && !deleteTarget && (
        <TxModalEx
          mode={txModal.mode}
          initial={txModal.mode === "add" ? { date: txModal.prefillDate } : txModal.tx}
          symbol={config.currencySymbol}
          onSave={handleSaveTx}
          onDelete={txModal.mode === "edit" ? () => setDeleteTarget(txModal.tx) : undefined}
          onClose={() => setTxModal({ mode: "closed" })}
        />
      )}

      {deleteTarget && (
        <DeleteDialogEx
          tx={deleteTarget}
          onConfirm={(scope) => { deleteTx(deleteTarget.id, scope); setDeleteTarget(null); setTxModal({ mode: "closed" }); }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium">{title}</h3>
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

function ItemModal({ mode, initial, defaultDate, onSave, onDelete, onClose }: {
  mode: "add" | "edit";
  initial?: Partial<ItineraryItem>;
  defaultDate?: string;
  onSave: (d: Omit<ItineraryItem, "id">) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [type, setType]         = useState<ItemType>(initial?.type ?? "activity");
  const [title, setTitle]       = useState(initial?.title ?? "");
  const [date, setDate]         = useState(initial?.date ?? defaultDate ?? "");
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

const EX_TX_TYPES: ExTxType[] = ["entrada", "saida", "diario"];
const EX_REC_OPTS: ExRecType[] = ["none", "daily", "weekly", "monthly"];

function DeleteDialogEx({ tx, onConfirm, onClose }: {
  tx: ExTx; onConfirm: (scope: "this" | "future" | "all") => void; onClose: () => void;
}) {
  const isRecurring = !!tx.recurrence && tx.recurrence.type !== "none";
  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h3 className="font-medium">Excluir movimentação</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{tx.description}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {isRecurring
            ? "Esta movimentação faz parte de uma recorrência. O que deseja excluir?"
            : "Tem certeza que deseja excluir esta movimentação?"}
        </p>
        <div className="space-y-2">
          {isRecurring && (
            <>
              <button onClick={() => onConfirm("this")}
                className="w-full text-left px-4 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors border border-border">
                <p className="font-medium">Apenas esta</p>
                <p className="text-xs text-muted-foreground mt-0.5">Exclui somente esta ocorrência</p>
              </button>
              <button onClick={() => onConfirm("future")}
                className="w-full text-left px-4 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors border border-border">
                <p className="font-medium">Esta e as futuras</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mantém as anteriores</p>
              </button>
            </>
          )}
          <button onClick={() => onConfirm(isRecurring ? "all" : "this")}
            className={`w-full text-left px-4 py-2.5 text-sm rounded-lg transition-colors border ${isRecurring ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "border-border hover:bg-secondary"}`}>
            <p className="font-medium">{isRecurring ? "Todas" : "Sim, excluir"}</p>
            {isRecurring && <p className="text-xs text-muted-foreground mt-0.5">Exclui todas as ocorrências (passadas e futuras)</p>}
          </button>
        </div>
        <button onClick={onClose}
          className="w-full mt-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TxModalEx({ mode, initial, symbol, onSave, onDelete, onClose }: {
  mode: "add" | "edit";
  initial?: Partial<ExTx>;
  symbol: string;
  onSave: (d: Omit<ExTx, "id"> & { recType?: "none" | "daily" | "weekly" | "monthly"; recTotal?: number }) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [type, setType]         = useState<ExTxType>(initial?.type ?? "saida");
  const [cat, setCat]           = useState<ExCat>(initial?.category ?? "alimentacao");
  const [desc, setDesc]         = useState(initial?.description ?? "");
  const [amount, setAmount]     = useState(initial?.amount != null ? String(initial.amount) : "");
  const [date, setDate]         = useState(initial?.date ?? "2026-09-01");
  const [recType, setRecType]   = useState<"none" | "daily" | "weekly" | "monthly">(initial?.recurrence?.type ?? "none");
  const [recTotal, setRecTotal] = useState(initial?.recurrence ? String(initial.recurrence.total) : "12");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount.replace(",", "."));
    if (!desc.trim() || isNaN(n)) return;
    onSave({
      type, category: cat, description: desc.trim(), amount: n, date,
      recType: mode === "add" ? recType : undefined,
      recTotal: mode === "add" && recType !== "none" ? parseInt(recTotal, 10) || 2 : undefined,
    });
  };

  return (
    <ModalShell title={mode === "add" ? "Nova movimentação" : "Editar"} onClose={onClose}>
      <form id="modal-form" onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>Tipo</label>
          <div className="flex gap-2">
            {EX_TX_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                  type === t
                    ? "text-white border-transparent font-medium"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                style={type === t ? { backgroundColor: EX_TX_CFG[t].color } : {}}>
                {EX_TX_CFG[t].label}
              </button>
            ))}
          </div>
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
        {type !== "entrada" && (
          <select value={cat} onChange={e => setCat(e.target.value as ExCat)}
            className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none">
            {EX_CATS.map(c => <option key={c} value={c}>{EX_CAT_CFG[c].label}</option>)}
          </select>
        )}

        {mode === "add" && (
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Repetição</p>
            <div className="flex gap-2">
              {EX_REC_OPTS.map(r => (
                <button key={r} type="button" onClick={() => setRecType(r)}
                  className={`flex-1 px-2 py-2 text-xs rounded-lg border transition-all text-center ${
                    recType === r ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {r === "none" ? "Única" : r === "daily" ? "Diária" : r === "weekly" ? "Semanal" : "Mensal"}
                </button>
              ))}
            </div>
            {recType !== "none" && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">Repetir por</label>
                <input type="number" min={2} max={999} value={recTotal} onChange={e => setRecTotal(e.target.value)}
                  className="w-16 px-2 py-1.5 text-sm rounded-lg bg-secondary border border-border text-center focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
                <span className="text-xs text-muted-foreground">
                  {recType === "daily" ? "dias" : recType === "weekly" ? "semanas" : "meses"}
                </span>
              </div>
            )}
          </div>
        )}

        <Actions onClose={onClose} onDelete={onDelete} saveLabel={mode === "add" ? "Adicionar" : "Salvar"} />
      </form>
    </ModalShell>
  );
}

function ConfigModal({ config, onSave, onClose }: { config: ExConfig; onSave: (c: ExConfig) => void; onClose: () => void }) {
  const [country, setCountry]       = useState(config.country);
  const [city, setCity]             = useState(config.city);
  const [startDate, setStartDate]   = useState(config.startDate);
  const [endDate, setEndDate]       = useState(config.endDate);
  const [budget, setBudget]         = useState(String(config.budget));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(budget.replace(",", "."));
    if (!country.trim() || !city.trim() || isNaN(n)) return;
    onSave({ country: country.trim(), city: city.trim(), currency: "GBP", currencySymbol: "£", exchangeRate: config.exchangeRate, budget: n, startDate, endDate });
  };

  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium">Editar intercâmbio</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground"><X size={14} /></button>
        </div>
        <form id="config-form" onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={country} onChange={e => setCountry(e.target.value)} required placeholder="País"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <input value={city} onChange={e => setCity(e.target.value)} required placeholder="Cidade"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>Fim</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Orçamento (£)</label>
            <input value={budget} onChange={e => setBudget(e.target.value)} required placeholder="3000"
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-secondary border border-border focus:outline-none" style={{ fontFamily: "'DM Mono', monospace" }} />
          </div>
          <div className="flex gap-2 pt-2 justify-end">
            <button onClick={onClose} className="px-3 py-2.5 text-sm rounded-lg hover:bg-secondary transition-colors text-muted-foreground">Cancelar</button>
            <button type="submit" className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-80 transition-all">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExchangePage() {
  const { config, setConfig, places, items } = useExchange();
  const [tab, setTab] = useState<ExTab>("roteiro");
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const today = new Date(2026, 6, 2);
  const start = parseISO(config.startDate);
  const end   = parseISO(config.endDate);
  const daysToGo  = differenceInDays(start, today);
  const totalDays = differenceInDays(end, start);
  const visitedCount = places.filter(p => p.visited).length;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="bg-card border border-border rounded-2xl p-5 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ background: "radial-gradient(ellipse at top right, #3B6FA0 0%, transparent 70%)" }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={16} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>Intercâmbio</p>
              <button onClick={() => setConfigModalOpen(true)}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <Pencil size={10} />
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">
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

      {configModalOpen && <ConfigModal config={config} onSave={c => { setConfig(c); setConfigModalOpen(false); }} onClose={() => setConfigModalOpen(false)} />}

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
