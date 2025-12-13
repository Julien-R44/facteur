// @ts-nocheck
import 'unpoly'
import mediumZoom from 'medium-zoom'
import { tabs } from 'edge-uikit/tabs'
import Alpine from 'alpinejs'
import docsearch from '@docsearch/js'
import {
  initZoomComponent,
  initBaseComponents,
  initSearchComponent,
} from '@dimerapp/docs-theme/scripts'
import Persist from '@alpinejs/persist'

import.meta.glob([
  '../content/**/*.png',
  '../content/**/*.jpeg',
  '../content/**/*.jpg',
  '../content/**/*.webp',
])

Alpine.plugin(tabs)
Alpine.plugin(Persist)
Alpine.plugin(initBaseComponents)
Alpine.plugin(initSearchComponent(docsearch))
Alpine.plugin(initZoomComponent(mediumZoom))
Alpine.start()
