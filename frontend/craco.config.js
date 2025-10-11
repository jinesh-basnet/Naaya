module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      if (webpackConfig.devServer) {
        webpackConfig.devServer.onAfterSetupMiddleware = undefined;
        webpackConfig.devServer.onBeforeSetupMiddleware = undefined;
        webpackConfig.devServer.setupMiddlewares = (middlewares, devServer) => {
          if (!devServer) {
            throw new Error('webpack-dev-server is not defined');
          }
          return middlewares;
        };
      }
      return webpackConfig;
    }
  }
};
