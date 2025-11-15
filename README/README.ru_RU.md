<div align="center">

# <img src="https://raw.githubusercontent.com/vrcx-team/VRCX/master/images/VRCX.ico" width="64" height="64"> </img> VRCXM

**Форк [VRCX](https://github.com/vrcx-team/VRCX) с современной темной темой и улучшенными функциями.**

[![GitHub релизы](https://img.shields.io/github/release/vrcx-team/VRCX.svg)](https://github.com/vrcx-team/VRCX/releases/latest)
[![Загрузки](https://img.shields.io/github/downloads/vrcx-team/VRCX/total?color=6451f1)](https://github.com/vrcx-team/VRCX/releases/latest)
[![Статус GitHub Workflow](https://github.com/vrcx-team/VRCX/actions/workflows/github_actions.yml/badge.svg)](https://github.com/vrcx-team/VRCX/actions/workflows/github_actions.yml)
[![VRCX приглашение в Discord](https://img.shields.io/discord/854071236363550763?color=%237289DA&logo=discord&logoColor=white&label=discord)](https://vrcx.app/discord)

| [English](/README.md) |

**Примечание:** Этот перевод может быть устаревшим. Обратитесь к [английской версии](/README.md) для получения самой актуальной информации, особенно о миграции с VRCX.

VRCXM — это форк VRCX, ассистента/компаньона приложения для VRChat, который предоставляет информацию о VRChat и помогает вам быстрее выполнять различные действия, связанные с VRChat в удобной форме, чем полагаться на простой VRChat клиент (настольный компьютер или VR), или только веб-сайт. Этот форк имеет полный редизайн с современной темной темой и дополнительными функциями, сохраняя при этом функциональность 1:1 с оригинальным VRCX.

# Начало работы

<div align="center">

**Примечание:** VRCXM — это форк и должен быть собран из исходного кода. См. [Сборка из исходного кода](#сборка-из-исходного-кода) ниже.

Оригинальный установщик VRCX (`VRCX_Setup.exe`) доступен [здесь](https://github.com/vrcx-team/VRCX/releases/latest).

# Особенности

<div align="left">

- :family: Управление списками друзей и аватаров
    - Управляйте списками ваших друзей, миры/группы/аватары вне VRChat.
    - Следите за активностью ваших друзей в мире/аватаре и проверьте их статус онлайн.
    - Следите за тем, когда вы добавляли их, и когда вы видели их в последний раз.
    - Посмотрите, сколько времени вы провели вместе в мирах и сколько раз.
    - Следите за изменениями в имени друга.
    - Сохраните заметки, чтобы вспомнить, как вы встретились.
- :electric_plug: Автоматически запускает приложения при запуске VRChat
    - Вы можете настроить VRCX на запуск других приложений при запуске VRChat.
    - Например, при открытии VRChat вы можете запустить приложение OSC или программу для изменения голоса.
- :mag: Поиск аватаров, пользователей, миров и групп
- :earth_americas: Создает локальный, неограниченный список избранных миров
- :camera: Храните данные о мире в фотографиях, которые вы делаете в игре, чтобы вы могли вспомнить тот мир, в котором вы сделали те классные фотографии, например... 6 месяцев назад!
- :bell: Мониторинг/ответ на уведомления
    - Вы можете отправить/получать приглашения и запросы друзей от VRCX, а также посмотреть информацию об инстансе приглашений, которые вы получили.
- :scroll: Просмотр статистики/игроков для вашего текущего инстанса
- :tv: Просмотрите ссылки на видеоролики, которые воспроизводятся в мире, в котором вы находитесь, а также различные другие записанные данные.
- :bar_chart: Улучшенный Discord Rich Presence
    - Вы можете отобразить дополнительную информацию о вашем текущем инстансе в Discord.
    - Интеграция в мир для таких популярных миров, как PyPyDance, LSMedia, Movies&Chill и VRDancing.
    - Это включает в себя эскиз мира, имя, идентификатор инстанса и количество игроков, в зависимости от ваших настроек и приватность лобби. Вы также можете добавить кнопку присоединиться для публичных лобби!
- :crystal_ball: VR-оверлей с настраиваемой прямой трансляцией всех поддерживаемых событий/уведомлений
- :outbox_tray: Загружать изображения аватара/мира без Unity
- :page_facing_up: Управление и редактирование загруженных деталей аватара/мира без Unity
- :skull: Автоматический перезапуск и присоединение к последнему инстансу при сбое VRC
- :left_right_arrow: Экспорт/импорт избранных групп

## Сборка из исходного кода

VRCXM должен быть собран из исходного кода. Обратитесь к оригинальному руководству VRCX [Сборка из исходного кода](https://github.com/vrcx-team/VRCX/wiki/Building-from-source) для получения инструкций. Процесс сборки идентичен VRCX.

## Миграция с VRCX

VRCXM использует отдельную папку данных (`VRCXM`) для избежания конфликтов с оригинальным VRCX. Если вы хотите перенести существующие данные VRCX (друзья, история ленты, избранное и т.д.) в VRCXM, обратитесь к [английской версии README](/README.md#migrating-from-vrcx) для получения подробных инструкций.

## Отличия от VRCX

- **Современная темная тема**: Полный визуальный редизайн с красивой темной эстетикой
- **Расширенные фильтры ленты**: Фильтрация по диапазону дат и улучшенные фильтры тегов/типов для ленты активности
- **Скрыть друзей из ленты**: Опция для скрытия конкретных друзей из ленты активности при продолжении отслеживания их данных
- **Панель аналитики**: Комплексная страница аналитики с:
  - Аналитика активности: Разбивка времени по мирам/аватарам
  - Социальная статистика: Рейтинг самых активных друзей
  - Аналитика миров и аватаров: Самые посещаемые миры и статистика использования аватаров
- **Настройки производительности**: Настраиваемый максимальный размер таблицы для запросов ленты и журнала игры
- **Отдельные данные приложения**: Использует папку `VRCXM` вместо `VRCX`
- **Все оригинальные функции VRCX сохранены**: Функциональная совместимость 1:1 с оригиналом

## Сопровождающий

VRCXM поддерживается [naiolune](https://github.com/naiolune).

Оригинальный VRCX разработан [pypy](https://github.com/pypy-vrc) и [Natsumi](https://github.com/Natsumi-sama).

## Ресурсы оригинального VRCX

- Хотите новый взгляд на VRCX? Посмотрите [Темы](https://github.com/vrcx-team/VRCX/wiki/Themes)
- См. [инструкции по сборке](https://github.com/vrcx-team/VRCX/wiki/Building-from-source) VRCX из исходного кода.
- Руководство по запуску VRCX на Linux можно найти [здесь](https://github.com/vrcx-team/VRCX/wiki/Running-VRCX-on-Linux)

# Скриншоты

<div align="center">

<h3>Вход в систему</h3>

<table>
  <tr>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251994190-5e6a961e-b2fe-4d3b-bf66-455d8626b8bf.png" alt="вход в систему"></td>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251994414-a21faf59-6199-45de-94e7-a093a6b8c0ac.png" alt="2fa"></td>
  </tr>
</table>

<h3>Лента новостей</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251987020-9839a2c9-47db-4271-b1bf-8e07669a7056.png" alt="лента новостей">

<h3>Журнал игры</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251987498-b82266ed-131d-42ad-be2f-b167f24acf9f.png" alt="журнал игры">

<h3>Информация о пользователе</h3>

<h4>Я</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251990237-0c863d27-141c-4447-82de-4279ab8973ea.png" alt="я">

<h4>Друг</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251989666-8f918786-e632-451d-be29-f92d2c681b80.png" alt="друг">

<h3>Мир</h3>

<table>
  <tr>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251991003-37a986bb-470c-442b-8ada-31918f7b2017.png" alt="инстанс"></td>
    <td align="center"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251991217-0d40846f-ac08-48c0-8e4d-18c35fe0999b.png" alt="информация"></td>
  </tr>
</table>

<h3>Избранное</h3>

<h4>Друг</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251992424-ba406d0f-787e-4e2d-89bd-4caa0a05d31f.png" alt="друг">

<h4>Мир</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251992950-8f2c6cdc-dc9a-4a60-b59f-9fa80d071359.png" alt="мир">

<h4>Аватар</h4>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251993408-66d11100-15a8-484f-b9fd-82be1516c9be.png" alt="аватары">

<h3>Журнал друзей</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251993741-e2033095-4ceb-4552-8b79-9285325c1e49.png" alt="журнал друзей">

<h3>Discord Rich Presence</h3>

<img src="https://github-production-user-asset-6210df.s3.amazonaws.com/82102170/251997318-5a71249c-59fc-4ad6-9194-d6b1d4165600.png" alt="discord">

<!-- The other images will be similar to this -->
</div>

## VRCXM против VRChat's TOS?

**Нет.**

VRCXM (как и VRCX) — это внешний инструмент, использующий API VRChat для предоставления своих возможностей.

Она никак не модифицирует игру, а лишь ответственно использует API для предоставления тех возможностей, которые она предоставляет. Это не мод, не чит и не любая другая модификация игры.

Ознакомиться с позицией VRChat по использованию API можно в канале #faq в VRChat Discord.

---

VRCXM не поддерживается VRChat и не отражает взглядов или мнений VRChat или кого-либо, официально вовлеченного в производство или управление свойствами VRChat. VRChat и все связанные с ним свойства являются торговыми марками или зарегистрированными торговыми марками VRChat Inc. VRChat © VRChat Inc.

VRCXM — это форк [VRCX](https://github.com/vrcx-team/VRCX) и не связан с командой VRCX.
