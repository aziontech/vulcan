export default {
  transform: {
    '^.+\\.(js|jsx)?$': '@swc/jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/examples/'],
  modulePathIgnorePatterns: ['<rootDir>/examples'],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/jest.global.setup.js',
  roots: ['<rootDir>/lib/utils'], // Adicione esta linha para especificar o diretório raiz dos testes
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'], // Adicione esta linha para especificar o padrão dos arquivos de teste
};
