
'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'

type Props = {
  initialGeometry: GeoJSON.Geometry | null
  onChange: (geometry: GeoJSON.Geometry | null) => void
}

function DrawControl({ initialGeometry, onChange }: Props) {
  const map = useMap()
  const callbackRef = useRef(onChange)

  useEffect(() => {
    callbackRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const group = new L.FeatureGroup()

    map.addLayer(group)

    // Carregar os polígonos já salvos
    if (initialGeometry) {
      L.geoJSON(initialGeometry).eachLayer((layer) => {
        group.addLayer(layer)
      })
    }

    function getGeometry(): GeoJSON.Geometry | null {
      const polygons: number[][][][] = []

      group.eachLayer((layer: any) => {
        const geometry = layer.toGeoJSON().geometry

        if (geometry.type === 'Polygon') {
          polygons.push(geometry.coordinates)
        }

        if (geometry.type === 'MultiPolygon') {
          polygons.push(...geometry.coordinates)
        }
      })

      if (polygons.length === 0) {
        return null
      }

      return {
        type: 'MultiPolygon',
        coordinates: polygons,
      }
    }

    function updateGeometry() {
      callbackRef.current(getGeometry())
    }

    function handleCreated(event: any) {
      group.addLayer(event.layer)
      updateGeometry()
    }

    function handleEdited() {
      updateGeometry()
    }

    function handleDeleted() {
      updateGeometry()
    }

    const control = new L.Control.Draw({
      position: 'topright',

      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },

      edit: {
        featureGroup: group,
        remove: true,
      },
    })

    map.addControl(control)

    map.on(L.Draw.Event.CREATED, handleCreated)
    map.on(L.Draw.Event.EDITED, handleEdited)
    map.on(L.Draw.Event.DELETED, handleDeleted)

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated)
      map.off(L.Draw.Event.EDITED, handleEdited)
      map.off(L.Draw.Event.DELETED, handleDeleted)

      map.removeControl(control)
      map.removeLayer(group)
    }
  }, [map])

  return null
}

export default function DeliveryAreaMap({
  initialGeometry,
  onChange,
}: Props) {
  return (
    <div
      style={{
        width: '100%',
        height: 420,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={[-4.83, -37.78]}
        zoom={13}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <DrawControl
          initialGeometry={initialGeometry}
          onChange={onChange}
        />
      </MapContainer>
    </div>
  )
}
