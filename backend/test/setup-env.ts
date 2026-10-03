// Os testes usam um banco próprio. Variáveis do processo têm precedência sobre o .env no @nestjs/config.
process.env.DB_NAME = 'ditado_test';
