import { Tabs } from "expo-router";
import { Home, Briefcase, Compass, Users, User } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/utils/auth/useAuth";
import { BLACK, TEXT_SUB, BG, BORDER } from "@/theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const { isAuthenticated } = useAuth();

  const baseTabBarStyle = {
    position: "absolute",
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    height: 64 + bottomInset,
    paddingTop: 6,
    paddingBottom: bottomInset,
    paddingHorizontal: 8,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  };


  const renderTabIcon = (Icon, color, focused) => (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "#F3F4F6" : "transparent",
      }}
    >
      <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: baseTabBarStyle,
        tabBarActiveTintColor: BLACK,
        tabBarInactiveTintColor: TEXT_SUB,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 0,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Início",
          tabBarIcon: ({ color, focused }) => renderTabIcon(Home, color, focused),
        }}
      />
      <Tabs.Screen
        name="empresas"
        options={{
          title: "Empresas",
          tabBarIcon: ({ color, focused }) => renderTabIcon(Compass, color, focused),
        }}
      />
      <Tabs.Screen
        name="vagas"
        options={{
          title: "Vagas",
          tabBarIcon: ({ color, focused }) => renderTabIcon(Briefcase, color, focused),
        }}
      />
      <Tabs.Screen
        name="freelancers"
        options={{
          title: "Talentos",
          tabBarIcon: ({ color, focused }) => renderTabIcon(Users, color, focused),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          // Sem sessão (login/registo) a barra inferior fica escondida
          tabBarStyle: isAuthenticated ? baseTabBarStyle : [baseTabBarStyle, { display: "none" }],
          tabBarIcon: ({ color, focused }) => renderTabIcon(User, color, focused),
        }}
      />
    </Tabs>
  );
}
