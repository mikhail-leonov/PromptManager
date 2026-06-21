/* Русский языковой пакет — саморегистрируется в window.AppLang. */
(function(){
  var L = (window.AppLang = window.AppLang || {
    dicts:{}, order:[],
    register:function(code, meta, dict){
      this.dicts[code] = { meta:meta, dict:dict };
      if(this.order.indexOf(code)===-1) this.order.push(code);
    }
  });

  L.register('ru', { name:'Русский', dir:'ltr' }, {
    lang_label:'Язык',
    /* боковая панель */
    templates:'Шаблоны',
    title_export:'Экспорт JSON', title_import:'Импорт JSON',
    title_new_folder:'Новая папка', title_new_template:'Новый шаблон',
    no_templates:'Пока нет шаблонов',
    /* действия со строками */
    title_subfolder:'Новая подпапка', title_rename:'Переименовать', title_delete_folder:'Удалить папку',
    title_edit:'Изменить', title_delete:'Удалить',
    /* основная панель */
    your_text:'Ваш текст',
    your_text_hint:'Введите текст — заменит <code>{{text}}</code> в выбранном шаблоне',
    result:'Результат', copy:'Копировать', copied:'Скопировано',
    output_placeholder:'Выберите шаблон и введите текст выше',
    /* окно */
    modal_new:'Новый шаблон', modal_edit:'Изменить шаблон',
    f_name:'Название шаблона', f_folder:'Папка', root:'Корень',
    f_body:'Текст шаблона — используйте <code>{{text}}</code> там, где будет ваш ввод',
    cancel:'Отмена', save:'Сохранить',
    /* запросы / подтверждения / предупреждения */
    prompt_folder_name:'Имя папки',
    alert_folder_exists:'Папка с таким именем уже существует здесь.',
    prompt_rename_folder:'Переименовать папку',
    confirm_delete_folder:'Удалить папку «{name}»? Её содержимое переместится в родительскую.',
    alert_fill_both:'Заполните название и текст шаблона.',
    confirm_delete_template:'Удалить этот шаблон?',
    alert_import_invalid:'Не удалось импортировать: неверный JSON-файл.'
  });
})();
