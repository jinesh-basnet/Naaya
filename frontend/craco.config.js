module.exports = {
  devServer: (devServerConfig) => {
    devServerConfig.allowedHosts = 'all';
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      return middlewares;
    };
    return devServerConfig;
  },
  webpack: {
    configure: (webpackConfig) => {
      return webpackConfig;
    }
  }
};
