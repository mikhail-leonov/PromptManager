/* English language pack — self-registers into window.AppLang.
   Copy this file, translate the values, change the code in register('xx', …),
   and add a <script> tag in index.html to add a language. */
(function(){
  var L = (window.AppLang = window.AppLang || {
    dicts:{}, order:[],
    register:function(code, meta, dict){
      this.dicts[code] = { meta:meta, dict:dict };
      if(this.order.indexOf(code)===-1) this.order.push(code);
    }
  });

  L.register('en', { name:'English', dir:'ltr' }, {
    lang_label:'Language',
    /* sidebar */
    templates:'Templates',
    title_export:'Export JSON', title_import:'Import JSON',
    title_new_folder:'New folder', title_new_template:'New template',
    no_templates:'No templates yet',
    /* row actions */
    title_subfolder:'New subfolder', title_rename:'Rename', title_delete_folder:'Delete folder',
    title_edit:'Edit', title_delete:'Delete',
    /* main panel */
    your_text:'Your text',
    your_text_hint:'Type your text — replaces <code>{{text}}</code> in the selected template',
    result:'Result', copy:'Copy', copied:'Copied',
    output_placeholder:'Select a template and type your text above',
    /* modal */
    modal_new:'New template', modal_edit:'Edit template',
    f_name:'Template name', f_folder:'Folder', root:'Root',
    f_body:'Template body — use <code>{{text}}</code> where your input goes',
    cancel:'Cancel', save:'Save',
    /* prompts / confirms / alerts */
    prompt_folder_name:'Folder name',
    alert_folder_exists:'A folder with that name already exists here.',
    prompt_rename_folder:'Rename folder',
    confirm_delete_folder:'Delete folder “{name}”? Its contents move to the parent.',
    alert_fill_both:'Please fill in both name and template body.',
    confirm_delete_template:'Delete this template?',
    alert_import_invalid:'Could not import: invalid JSON file.'
  });
})();
