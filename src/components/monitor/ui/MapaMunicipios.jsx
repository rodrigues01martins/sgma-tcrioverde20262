import { useEffect, useRef } from 'react'
import { encontrarMunicipioGoias } from '../../../data/municipiosGoias'

// Mapa de círculos proporcionais por município — reutilizado pelo Eixo 2
// (Alcance, contagem de aprendizes) e pelo Gerencial (contagem de jovens
// com Vale Transporte). Quem chama decide o que está sendo contado.
export default function MapaMunicipios({ contagensPorCidade, rotulo = 'registros', totalBase }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    const cidadeMap = contagensPorCidade || {}
    if (!Object.keys(cidadeMap).length) return

    function inicializarMapa() {
      if (!mapRef.current || mapInstanceRef.current) return
      const L = window.L

      const map = L.map(mapRef.current, { zoomControl: true }).setView([-16.0, -49.5], 7)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      const counts = Object.values(cidadeMap)
      const maxCount = counts.length ? Math.max(...counts) : 1
      const minCount = counts.length ? Math.min(...counts) : 1

      let naoEncontrados = []

      Object.entries(cidadeMap).forEach(([cidade, count]) => {
        // Match tolerante a acento/caixa contra a base canônica — antes
        // era um lookup direto em COORDS_GOIAS (243 registros, sensível
        // a acento), por isso alguns municípios nunca apareciam no mapa.
        const municipio = encontrarMunicipioGoias(cidade)
        if (!municipio) {
          naoEncontrados.push(cidade)
          return
        }
        const coords = [municipio.latitude, municipio.longitude]

        const ratio = maxCount > minCount ? (count - minCount) / (maxCount - minCount) : 1
        const radius = 6 + ratio * 34
        const opacity = 0.4 + ratio * 0.5
        const pct = totalBase ? ((count / totalBase) * 100).toFixed(1) : null

        const circle = L.circleMarker(coords, {
          radius,
          fillColor: '#356859',
          color: '#2a5247',
          weight: 1.5,
          opacity: 1,
          fillOpacity: opacity,
        }).addTo(map)

        circle.bindTooltip(`
          <div style="font-family: Inter, sans-serif; padding: 4px 2px;">
            <strong style="color: #356859; font-size: 13px; display: block;">${cidade}</strong>
            <span style="font-size: 12px; color: #4B5563;">${count} ${rotulo}</span>
          </div>
        `, { sticky: true, opacity: 0.95, className: 'mapa-tooltip' })

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 180px; padding: 4px;">
            <strong style="color: #356859; font-size: 14px; display: block; margin-bottom: 6px;">${cidade}</strong>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #4B5563;">
              <span>${rotulo}</span>
              <strong style="color: #356859;">${count}</strong>
            </div>
            ${pct !== null ? `
              <div style="display: flex; justify-content: space-between; font-size: 12px; color: #4B5563; margin-top: 4px;">
                <span>% do total</span>
                <strong style="color: #356859;">${pct}%</strong>
              </div>
            ` : ''}
          </div>
        `)

        circle.on('mouseover', function () {
          this.setStyle({
            fillColor: '#FD5523',
            color: '#c44019',
            weight: 2.5,
            fillOpacity: Math.min(opacity + 0.2, 1),
            radius: radius + 4,
          })
          this.setRadius(radius + 4)
          this.openTooltip()
        })

        circle.on('mouseout', function () {
          this.setStyle({
            fillColor: '#356859',
            color: '#2a5247',
            weight: 1.5,
            fillOpacity: opacity,
          })
          this.setRadius(radius)
        })
      })

      if (naoEncontrados.length) {
        console.warn('Municípios não encontrados no mapa:', naoEncontrados)
      }
    }

    if (window.L) {
      inicializarMapa()
    } else {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = inicializarMapa
      document.head.appendChild(script)
    }

    if (!document.getElementById('mapa-tooltip-style')) {
      const style = document.createElement('style')
      style.id = 'mapa-tooltip-style'
      style.textContent = `
        .mapa-tooltip {
          background: white;
          border: 1px solid #B9E4C9;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          padding: 8px 12px;
          pointer-events: none;
        }
        .mapa-tooltip::before { display: none; }
        .leaflet-tooltip-bottom.mapa-tooltip::before { display: none; }
      `
      document.head.appendChild(style)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [contagensPorCidade, rotulo, totalBase])

  return (
    <div ref={mapRef} style={{ height: '480px', width: '100%', borderRadius: '0 0 var(--radius-md) var(--radius-md)', zIndex: 1 }} />
  )
}
