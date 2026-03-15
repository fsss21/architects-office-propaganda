import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCatalogFilter } from '../../context/CatalogFilterContext'
import Header from '../../components/Header/Header'
import styles from './Catalog.module.css'
import catalogImg from '../../assets/catalog_img.png'
import catalogImg4k from '../../assets/catalog_img-4k.png'

import ArrowLeftIcon from '@mui/icons-material/ArrowLeft'
import ArrowRightIcon from '@mui/icons-material/ArrowRight'

// Маппинг года из creationTime в эпохи (по данным catalogItems.json)
const getErasFromCreationTime = (creationTime) => {
  if (!creationTime) return []
  const matches = String(creationTime).match(/\d{4}/g)
  const years = matches ? matches.map((m) => parseInt(m, 10)) : []
  const eras = []
  for (const year of years) {
    if (year < 1800) eras.push('XVIII век')
    if (year >= 1800 && year < 1900) eras.push('XIX век')
    if (year >= 1900 && year < 2000) eras.push('XX век')
    if (year >= 1760 && year <= 1840) eras.push('Эпоха классицизма')
  }
  return [...new Set(eras)]
}

const matchesSearch = (item, query) => {
  if (!query || !query.trim()) return true
  const q = query.trim().toLowerCase()
  const searchIn = [
    item.name,
    item.title,
    item.sculptor,
    item.coauthors,
    item.location,
    item.creationTime,
    item.material,
    ...(Array.isArray(item.texts) ? item.texts : []),
  ].filter(Boolean).join(' ')
  return searchIn.toLowerCase().includes(q)
}

const getItemImageSrc = (item) => {
  if (item?.image) return `/data/images/${item.image}`
  if (item?.photos?.length) return item.photos[0]
  return null
}

const VISIBLE_ITEMS = 4

function Catalog() {
  const navigate = useNavigate()
  const { selectedSculptors, selectedEras, selectedMaterials, searchQuery } = useCatalogFilter()
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [imageSrc, setImageSrc] = useState(catalogImg)
  const [items, setItems] = useState([])

  useEffect(() => {
    // Определяем, нужно ли использовать 4K изображение
    // Для экранов с шириной >= 2560px или высотой >= 1440px используем 4K версию
    const is4K = window.innerWidth >= 2560 || window.innerHeight >= 1440
    setImageSrc(is4K ? catalogImg4k : catalogImg)

    // Загружаем предметы каталога из JSON файла
    fetch('/data/catalogItems.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then(data => {
        setItems(Array.isArray(data) ? data : [])
      })
      .catch(err => console.error('Error loading catalog items:', err))
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedSculptors.length > 0 && !selectedSculptors.includes(item.sculptor)) return false
      if (selectedEras.length > 0) {
        const itemEras = getErasFromCreationTime(item.creationTime)
        const hasEra = selectedEras.some((era) => itemEras.includes(era))
        if (!hasEra) return false
      }
      if (selectedMaterials.length > 0) {
        const material = item.material || ''
        if (!selectedMaterials.includes(material)) return false
      }
      if (!matchesSearch(item, searchQuery)) return false
      return true
    })
  }, [items, selectedSculptors, selectedEras, selectedMaterials, searchQuery])

  const maxStartIndex = Math.max(0, filteredItems.length - VISIBLE_ITEMS)

  useEffect(() => {
    setCurrentItemIndex((prev) => Math.min(prev, maxStartIndex))
  }, [filteredItems.length, maxStartIndex])

  const visibleItems = useMemo(() => {
    return filteredItems.slice(currentItemIndex, currentItemIndex + VISIBLE_ITEMS)
  }, [filteredItems, currentItemIndex])

  const handleNextItem = () => {
    if (currentItemIndex < maxStartIndex) {
      setCurrentItemIndex((prev) => Math.min(prev + 1, maxStartIndex))
    }
  }

  const handlePrevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => Math.max(prev - 1, 0))
    }
  }

  const handleItemClick = (item) => {
    // При клике на предмет открываем страницу с предметом
    navigate(`/catalog/${item.id}`)
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className={styles.catalog}>
      <div
        className={styles.catalogBackground}
        style={{ backgroundImage: `url(${imageSrc})` }}
      />
      <Header />
      <div className={styles.catalogContent}>
        {/* Центральная область с предметами */}
        <div className={styles.catalogCenter}>
          <div className={styles.catalogItemsContainer}>
            {filteredItems.length === 0 ? (
              <p className={styles.catalogEmpty}>По вашему запросу ничего не найдено. Измените фильтры или поиск.</p>
            ) : (
            visibleItems.map((item, index) => {
              const blockPositionClass =
                index === 0 ? ''
                : index === 1 ? styles.catalogItemMiddle
                : index === 2 ? ''
                : styles.catalogItemTop

                return (
                  <div
                    key={item.id}
                    className={`${styles.catalogItem} ${blockPositionClass}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className={styles.catalogItemImage}>
                      {getItemImageSrc(item) ? (
                        <img
                          src={getItemImageSrc(item)}
                          alt={item.name ?? ''}
                          onError={(e) => {
                            if (e?.target) e.target.style.display = 'none'
                          }}
                        />
                      ) : null}
                    </div>
                    <div className={styles.catalogItemOverlay}>
                      <h3 className={styles.catalogItemTitle}>
                        {item?.name || item?.title || ''}
                      </h3>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Кнопки навигации: переключение между группами по 4 предмета */}
          <div className={styles.catalogControls}>
            <button
              className={styles.catalogArrow}
              onClick={handlePrevItem}
              disabled={filteredItems.length === 0 || currentItemIndex === 0}
              aria-label="Предыдущие предметы"
            >
              <ArrowLeftIcon fontSize='large' />
            </button>
            <span className={styles.catalogCounter}>
              {currentItemIndex + 1}–{Math.min(currentItemIndex + VISIBLE_ITEMS, filteredItems.length)} из {filteredItems.length}
            </span>
            <button
              className={styles.catalogArrow}
              onClick={handleNextItem}
              disabled={filteredItems.length === 0 || currentItemIndex >= maxStartIndex}
              aria-label="Следующие предметы"
            >
              <ArrowRightIcon fontSize='large' />
            </button>
          </div>
        </div>

        {/* Кнопка "Назад" внизу слева */}
        <div className={styles.catalogBottomNavigation}>
          <button
            type="button"
            className={styles.catalogBackBtn}
            onClick={handleBack}
            aria-label="Назад"
          >
            Назад
          </button>
        </div>
      </div>
    </div>
  )
}

export default Catalog
