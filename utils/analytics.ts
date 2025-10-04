// Basic usage analytics
export const trackEvent = (event: string, data?: any) => {
  console.log('Analytics:', event, data);
};

export const Events = {
  USER_LOGIN: 'user_login',
  DOCUMENT_UPLOAD: 'document_upload', 
  CHAT_MESSAGE: 'chat_message',
  FEEDBACK_SUBMIT: 'feedback_submit'
};
