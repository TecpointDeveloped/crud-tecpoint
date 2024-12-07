import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NextUIProvider } from '@nextui-org/react'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NextUIProvider>
      <App />
    </NextUIProvider>
  </StrictMode>,
)

{/* <select
          className="border w-full py-2 px-4 rounded-md"
          name="brand"
          value={formData.brand}
          onChange={handleChange}
        >
          <option value="" disabled>
            Selecciona una marca
          </option>
          <option value="Hypergear">Hypergear</option>
          <option value="Naztech">Naztech</option>
          <option value="PowerPeak">PowerPeak</option>
          <option value="Krieg">Krieg</option>
          <option value="Deken">Deken</option>
          <option value="Appacs">Appacs</option>
          <option value="USG">USG</option>
          <option value="XBase">XBase</option>
          <option value="Ghostek">Ghostek</option>
          <option value="Imilab">Imilab</option>
          <option value="Samsung">Samsung</option>
          <option value="Apple">Apple</option>
          <option value="Coast">Coast</option>
          <option value="Rock Space">Rock Space</option>
        </select> */}