'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

let L: any; 
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

interface LocationData {
  id: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  radius?: number; // Optional - chỉ hiển thị khi có giá trị thực tế
}

interface ReadOnlyMultiTimeLocationViewerProps {
  initialLocations?: LocationData[];
  isDarkMode?: boolean;
}

const timeSlotConfig = {
  morning: {
    label: 'Buổi sáng',
    color: '#FFD700',
    icon: '🌅',
    timeRange: '06:00 - 12:00',
    description: 'Hoạt động buổi sáng',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-700',
    textColor: 'text-yellow-800 dark:text-yellow-200'
  },
  afternoon: {
    label: 'Buổi chiều',
    color: '#FF6B35',
    icon: '☀️',
    timeRange: '12:00 - 18:00',
    description: 'Hoạt động buổi chiều',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700',
    textColor: 'text-orange-800 dark:text-orange-200'
  },
  evening: {
    label: 'Buổi tối',
    color: '#4A90E2',
    icon: '🌙',
    timeRange: '18:00 - 22:00',
    description: 'Hoạt động buổi tối',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-700',
    textColor: 'text-blue-800 dark:text-blue-200'
  }
};

export default function ReadOnlyMultiTimeLocationViewer({
  initialLocations = [],
  isDarkMode = false,
}: ReadOnlyMultiTimeLocationViewerProps) {
  const [locations] = useState<LocationData[]>(initialLocations);
  const mapRef = useRef<any>(null);
  const [currentZoom, setCurrentZoom] = useState(16);

  // Default center (TDMU coordinates)
  const defaultCenter: [number, number] = [10.7325, 106.6992];

  useEffect(() => {
    // Fix Leaflet icon issue
    if (typeof window !== 'undefined') {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  }, []);

  const center: [number, number] = locations.length > 0
    ? [locations[0].location.lat, locations[0].location.lng]
    : defaultCenter;

  const handleZoom = () => {
    if (mapRef.current) {
      setCurrentZoom(mapRef.current.getZoom());
    }
  };

  // Hàm kiểm tra xem 2 vị trí có trùng nhau không (trong phạm vi 0.0001 độ ≈ 11m)
  const areLocationsSame = (loc1: LocationData, loc2: LocationData): boolean => {
    const latDiff = Math.abs(loc1.location.lat - loc2.location.lat);
    const lngDiff = Math.abs(loc1.location.lng - loc2.location.lng);
    return latDiff < 0.0001 && lngDiff < 0.0001;
  };

  // Hàm nhóm các locations trùng vị trí
  const groupOverlappingLocations = (): Map<string, LocationData[]> => {
    const groups = new Map<string, LocationData[]>();
    
    locations.forEach((location) => {
      let foundGroup = false;
      // Tìm nhóm có vị trí trùng
      for (const [key, group] of groups.entries()) {
        if (group.length > 0 && areLocationsSame(location, group[0])) {
          group.push(location);
          foundGroup = true;
          break;
        }
      }
      // Nếu không tìm thấy nhóm, tạo nhóm mới
      if (!foundGroup) {
        const groupKey = `${location.location.lat.toFixed(6)},${location.location.lng.toFixed(6)}`;
        groups.set(groupKey, [location]);
      }
    });
    
    return groups;
  };

  // Hàm tính vị trí label với offset để tránh chồng lấp
  const getLabelPosition = (location: LocationData, indexInGroup: number, groupSize: number): [number, number] => {
    const safeRadius = location.radius && !isNaN(location.radius) ? location.radius : 200;
    const baseOffset = (safeRadius / 111320) * 1.2; // Convert radius to degrees and add spacing
    
    // Nếu chỉ có 1 location, đặt ở trên
    if (groupSize === 1) {
      return [location.location.lat + baseOffset, location.location.lng];
    }
    
    // Nếu có nhiều locations trùng, phân bổ theo các hướng
    // indexInGroup: 0 = top, 1 = right, 2 = bottom, 3 = left
    const positions: Array<[number, number]> = [
      [location.location.lat + baseOffset, location.location.lng], // top
      [location.location.lat, location.location.lng + baseOffset], // right
      [location.location.lat - baseOffset, location.location.lng], // bottom
      [location.location.lat, location.location.lng - baseOffset], // left
    ];
    
    return positions[indexInGroup % positions.length];
  };

  // Hàm tính iconAnchor dựa trên vị trí label
  const getIconAnchor = (indexInGroup: number, groupSize: number): [number, number] => {
    if (groupSize === 1) {
      return [50, 40]; // Bottom center (label ở trên)
    }
    
    const anchors: Array<[number, number]> = [
      [50, 40], // top -> bottom center anchor
      [0, 20],  // right -> left center anchor
      [50, 0],  // bottom -> top center anchor
      [100, 20], // left -> right center anchor
    ];
    
    return anchors[indexInGroup % anchors.length];
  };

  return (
    <div className="relative rounded-xl overflow-hidden border-2 focus:outline-none bg-gray-50/50 dark:bg-gray-800/50" style={{ height: '400px' }}>
      <MapContainer
        center={center}
        zoom={currentZoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        whenReady={() => {
          if (mapRef.current) {
            mapRef.current.on('zoomend', handleZoom);
            // Optional: fit bounds to all markers if there are locations
            if (locations.length > 0) {
              const bounds = L.latLngBounds(locations.map(loc => [loc.location.lat, loc.location.lng]));
              mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
          }
        }}
        zoomControl={true}
        doubleClickZoom={false}
        dragging={true}
      >
        <TileLayer
          url={isDarkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {(() => {
          // Nhóm các locations trùng vị trí
          const locationGroups = groupOverlappingLocations();
          const locationToGroupInfo = new Map<string, { group: LocationData[], index: number }>();
          
          // Tạo map để tra cứu nhanh thông tin nhóm cho mỗi location
          for (const group of locationGroups.values()) {
            group.forEach((loc, index) => {
              locationToGroupInfo.set(loc.id, { group, index });
            });
          }
          
          // Render theo nhóm: mỗi nhóm trùng vị trí chỉ render 1 lần với label tổng hợp
          const renderedGroups = new Set<string>();
          
          return locations.map((location) => {
            const groupInfo = locationToGroupInfo.get(location.id);
            const groupSize = groupInfo?.group.length || 1;
            const indexInGroup = groupInfo?.index || 0;
            
            // Tạo key cho nhóm dựa trên tọa độ
            const groupKey = `${location.location.lat.toFixed(6)},${location.location.lng.toFixed(6)}`;
            
            // Nếu đã render nhóm này rồi và đây không phải phần tử đầu tiên, bỏ qua
            if (renderedGroups.has(groupKey) && indexInGroup > 0) {
              // Chỉ render Marker để có popup riêng cho từng buổi
              return (
                <Marker key={location.id} position={[location.location.lat, location.location.lng]}>
                  <Popup className={`modern-popup ${isDarkMode ? 'dark' : ''}`}>
                    <div className="min-w-[200px] max-w-[280px] p-0">
                      <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                            {timeSlotConfig[location.timeSlot].icon}
                          </div>
                          <div>
                            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {timeSlotConfig[location.timeSlot].label}
                            </h3>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {timeSlotConfig[location.timeSlot].timeRange}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-blue-500">📍</span>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Địa chỉ:</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} pl-6`}>
                            {location.location.address}
                          </p>
                        </div>
                        {location.radius !== undefined && location.radius !== null && !isNaN(location.radius) && (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-500">📏</span>
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bán kính:</span>
                              <span className={`text-xs font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {location.radius}m
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            
            // Đánh dấu đã render nhóm này
            renderedGroups.add(groupKey);
            
            // Render đầy đủ cho phần tử đầu tiên của nhóm (hoặc đơn lẻ)
            const labelPos = getLabelPosition(location, indexInGroup, groupSize);
            const iconAnchor = getIconAnchor(indexInGroup, groupSize);
            
            // Nếu có nhiều locations trùng, lấy radius lớn nhất
            const maxRadius = groupSize > 1 && groupInfo?.group
              ? Math.max(...groupInfo.group.map(loc => (loc.radius && !isNaN(loc.radius)) ? loc.radius : 0))
              : (location.radius && !isNaN(location.radius)) ? location.radius : undefined;
            
            return (
              <div key={location.id}>
                <Marker position={[location.location.lat, location.location.lng]}>
                  <Popup className={`modern-popup ${isDarkMode ? 'dark' : ''}`}>
                    <div className="min-w-[200px] max-w-[280px] p-0">
                      <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                            {groupSize > 1 ? '📍' : timeSlotConfig[location.timeSlot].icon}
                          </div>
                          <div>
                            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {groupSize > 1 ? `${groupSize} buổi` : timeSlotConfig[location.timeSlot].label}
                            </h3>
                            {groupSize > 1 ? (
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {groupInfo?.group.map(loc => timeSlotConfig[loc.timeSlot].label).join(', ')}
                              </p>
                            ) : (
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {timeSlotConfig[location.timeSlot].timeRange}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-blue-500">📍</span>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Địa chỉ:</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} pl-6`}>
                            {location.location.address}
                          </p>
                        </div>
                        {groupSize > 1 && groupInfo?.group && (
                          <div className="space-y-2">
                            {groupInfo.group.map((loc, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span>{timeSlotConfig[loc.timeSlot].icon}</span>
                                  <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {timeSlotConfig[loc.timeSlot].label}:
                                  </span>
                                  {loc.radius !== undefined && loc.radius !== null && !isNaN(loc.radius) && (
                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                      {loc.radius}m
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {groupSize === 1 && location.radius !== undefined && location.radius !== null && !isNaN(location.radius) && (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-500">📏</span>
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Bán kính:</span>
                              <span className={`text-xs font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {location.radius}m
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Chỉ render 1 circle cho nhóm trùng vị trí (dùng radius lớn nhất) */}
                {maxRadius !== undefined && (
                  <Circle
                    key={`circle-${groupKey}`}
                    center={[location.location.lat, location.location.lng]}
                    radius={maxRadius}
                    pathOptions={{
                      color: groupSize > 1 ? '#8B5CF6' : timeSlotConfig[location.timeSlot].color,
                      fillColor: groupSize > 1 ? '#8B5CF6' : timeSlotConfig[location.timeSlot].color,
                      fillOpacity: 0.25,
                      weight: 3,
                      dashArray: '5, 5',
                    }}
                  />
                )}
                
                {/* Label tổng hợp cho nhóm trùng vị trí */}
                {maxRadius !== undefined && (
                  <Marker
                    key={`label-${groupKey}`}
                    position={labelPos}
                    icon={(() => {
                      if (typeof window !== 'undefined') {
                        const L = require('leaflet');
                        const bgColor = isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)';
                        const textColor = isDarkMode ? '#ffffff' : '#000000';
                        
                        // Tạo label tổng hợp nếu có nhiều buổi
                        let labelHtml = '';
                        if (groupSize > 1 && groupInfo?.group) {
                          const slotLabels = groupInfo.group.map(loc => {
                            const slotConfig = timeSlotConfig[loc.timeSlot];
                            const radiusText = loc.radius && !isNaN(loc.radius) ? `${loc.radius}m` : '';
                            return `${slotConfig.icon} ${slotConfig.label}${radiusText ? ` ${radiusText}` : ''}`;
                          }).join(', ');
                          labelHtml = `
                            <div class="radius-label-marker" style="
                              background: ${bgColor};
                              color: ${textColor};
                              padding: 8px 14px;
                              border-radius: 16px;
                              font-size: 11px;
                              font-weight: bold;
                              border: 2px solid #8B5CF6;
                              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                              white-space: nowrap;
                              z-index: 1000;
                              backdrop-filter: blur(4px);
                              text-align: center;
                              pointer-events: none;
                              display: inline-flex;
                              align-items: center;
                              gap: 6px;
                            ">
                              <span style="font-size: 13px;">📍</span>
                              <span style="font-size: 11px;">${slotLabels}</span>
                            </div>
                          `;
                        } else {
                          // Label đơn cho 1 buổi
                          const slotConfig = timeSlotConfig[location.timeSlot];
                          labelHtml = `
                            <div class="radius-label-marker" style="
                              background: ${bgColor};
                              color: ${textColor};
                              padding: 6px 12px;
                              border-radius: 16px;
                              font-size: 12px;
                              font-weight: bold;
                              border: 2px solid ${slotConfig.color};
                              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                              white-space: nowrap;
                              z-index: 1000;
                              backdrop-filter: blur(4px);
                              text-align: center;
                              pointer-events: none;
                              display: inline-flex;
                              align-items: center;
                              gap: 6px;
                            ">
                              <span style="font-size: 14px;">${slotConfig.icon}</span>
                              <span style="font-size: 12px;">${slotConfig.label}</span>
                              <span style="font-size: 12px; font-weight: bold;">${location.radius}m</span>
                            </div>
                          `;
                        }
                        
                        return L.divIcon({
                          html: labelHtml,
                          iconSize: [null, null],
                          iconAnchor: iconAnchor,
                          className: 'custom-div-icon'
                        });
                      }
                      return undefined;
                    })()}
                  />
                )}
              </div>
            );
          });
        })()}
      </MapContainer>

      <style dangerouslySetInnerHTML={{
        __html: `
          .modern-popup {
            background: white !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          .modern-popup.dark {
            background: #1f2937 !important;
            border-color: #374151 !important;
            color: white !important;
          }

          .radius-label-marker {
            background: transparent !important;
            border: none !important;
          }

          .radius-label-marker div {
            user-select: none;
          }

          .custom-div-icon {
            background: transparent !important;
            border: none !important;
          }
        `
      }} />
    </div>
  );
}
