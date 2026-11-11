import 'react-native-gesture-handler';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StoreProvider} from '../src/store';
import {C} from '../src/theme';
export default function Layout(){return <SafeAreaProvider><StoreProvider><SafeAreaView edges={['top','bottom']} style={{flex:1,backgroundColor:C.bg}}><StatusBar style="dark" backgroundColor={C.bg}/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:C.bg},animation:'slide_from_right',gestureEnabled:true}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="criar" options={{presentation:'modal',animation:'slide_from_bottom'}}/><Stack.Screen name="perguntar" options={{presentation:'modal',animation:'slide_from_bottom'}}/><Stack.Screen name="buscar" options={{presentation:'modal',animation:'slide_from_bottom'}}/></Stack></SafeAreaView></StoreProvider></SafeAreaProvider>}
