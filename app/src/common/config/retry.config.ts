export default () => ({
  retry: {
    attempts: parseInt(process.env.RETRY_ATTEMPTS ?? '3', 10),
    maxTimeout: parseInt(process.env.RETRY_MAX_TIME_OUT ?? '10000', 10),
  },
});
