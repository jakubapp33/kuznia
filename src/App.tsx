import { createHashRouter } from 'react-router'
import { Layout } from './components/Layout'
import { Today } from './pages/Today'
import { Train } from './pages/Train'
import { PlanEdit } from './pages/PlanEdit'
import { TemplateView } from './pages/TemplateView'
import { Session } from './pages/Session'
import { History } from './pages/History'
import { WorkoutDetail } from './pages/WorkoutDetail'
import { ExerciseList } from './pages/ExerciseList'
import { ExerciseDetail } from './pages/ExerciseDetail'
import { ExerciseForm } from './pages/ExerciseForm'
import { Diet } from './pages/Diet'
import { FoodAdd } from './pages/FoodAdd'
import { FoodForm } from './pages/FoodForm'
import { Targets } from './pages/Targets'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'

// HashRouter – działa na GitHub Pages bez konfiguracji serwera
export const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Today /> },
      { path: '/trening', element: <Train /> },
      { path: '/trening/plan/:id', element: <PlanEdit /> },
      { path: '/trening/szablon/:id', element: <TemplateView /> },
      { path: '/trening/sesja', element: <Session /> },
      { path: '/trening/historia', element: <History /> },
      { path: '/trening/historia/:id', element: <WorkoutDetail /> },
      { path: '/cwiczenia', element: <ExerciseList /> },
      { path: '/cwiczenia/nowe', element: <ExerciseForm /> },
      { path: '/cwiczenia/:id', element: <ExerciseDetail /> },
      { path: '/cwiczenia/:id/edytuj', element: <ExerciseForm /> },
      { path: '/dieta', element: <Diet /> },
      { path: '/dieta/dodaj', element: <FoodAdd /> },
      { path: '/dieta/produkt', element: <FoodForm /> },
      { path: '/dieta/cele', element: <Targets /> },
      { path: '/postep', element: <Progress /> },
      { path: '/ustawienia', element: <Settings /> },
    ],
  },
])
