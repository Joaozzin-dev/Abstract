/**
 * Abas principais — Jornada | Ranking | Perfil
 * Integre no seu App.js com NavigationContainer.
 *
 * Exemplo:
 *   import AppTabs from './src/navigation/AppTabs'
 *   <NavigationContainer>
 *     <AppTabs firebaseDeps={{ db, auth, doc, getDoc, setDoc, ... }} />
 *   </NavigationContainer>
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import JourneyScreen from '../screens/JourneyScreen'
import RankingScreen from '../screens/RankingScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ValeSilencioScreen from '../screens/ValeSilencioScreen'

// Importe suas fases
// import Fase1 from '../fases/fase1'
// import Fase2 from '../fases/fase2'
// import Fase3 from '../fases/fase3'
// import Fase4 from '../fases/fase4'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const C = {
  cream: '#FFF8EA',
  ink: '#1F2A48',
  inkMuted: '#6B7391',
  green: '#58CC02',
  violet: '#7C5CFF',
}

function JourneyStack({ firebaseDeps }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="JornadaHome">
        {(props) => <JourneyScreen {...props} firebaseDeps={firebaseDeps} />}
      </Stack.Screen>
      {/* Descomente quando as fases estiverem no projeto:
      <Stack.Screen name="Fase1" component={Fase1} />
      <Stack.Screen name="Fase2" component={Fase2} />
      <Stack.Screen name="Fase3" component={Fase3} />
      <Stack.Screen name="Fase4" component={Fase4} />
      */}
      <Stack.Screen name="ValeSilencio">
        {(props) => <ValeSilencioScreen {...props} firebaseDeps={firebaseDeps} />}
      </Stack.Screen>
    </Stack.Navigator>
  )
}

export default function AppTabs({ firebaseDeps, userName }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.inkMuted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#EADFC5',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontWeight: '800', fontSize: 11 },
        tabBarIcon: ({ color, size }) => {
          const map = {
            Jornada: 'book',
            Ranking: 'trophy',
            Perfil: 'person',
          }
          return <Ionicons name={map[route.name] || 'ellipse'} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Jornada" options={{ title: 'Jornada' }}>
        {() => <JourneyStack firebaseDeps={firebaseDeps} />}
      </Tab.Screen>
      <Tab.Screen name="Ranking" options={{ title: 'Ranking' }}>
        {(props) => <RankingScreen {...props} firebaseDeps={firebaseDeps} />}
      </Tab.Screen>
      <Tab.Screen name="Perfil" options={{ title: 'Perfil' }}>
        {(props) => <ProfileScreen {...props} firebaseDeps={firebaseDeps} userName={userName} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}
