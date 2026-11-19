export type RootStackParamList = {
  Auth: undefined;
  Welcome: undefined;
  Main: undefined;
};

export type TabParamList = {
  Chat: { conversationId?: string } | undefined;
  History: undefined;
  Info: undefined;
  Admin: undefined;
};
