### Заметки по проекту

1. Все сущности по типу Schedule, Init и Repair, которые запускаются
через внедрение зависимостей конфигурации навсегда остаются в памяти.
2. Во время запусков приложения за пределами тестов особое внимание  
нужно уделить тестированию rpc методов, так как их невозможно повсеместно  
нормально тестировать

### Подсчёт строк кода в проекте

```bash
find . -name tests -prune -o -type f -name '*.ts' | xargs wc -l
```

### Тесты

Теги, которые используются в тестах: 
- #cold
- #gc (нужно запускать с --expose-gc и --runInBand)

### Путеводитель

1. Заменяемость модуля
2. Утечки памяти
3. Дальнейшее развитие
4. Тестируемость
5. Расширяемость
6. Устойчивость к резкому прерыванию работы.
7. Устойчивость к состоянию гонки и совместным ресурсам
8. Соблюдение принципов solid
9. Дженерики вместо any
10. Оставлять возможность для расширения функционала, но реализовывать каждый раз только минимально необходимую его часть.
11. Изолировать все модули. Ни в коем случае не допускать ситуацию, когда какую-то проблему сложно мысленно охватить. Что-то становится слишком сложным? Упрощай!
