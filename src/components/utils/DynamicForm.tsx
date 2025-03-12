import {useRef, useState} from "preact/hooks";

export type DynamicFormFieldType = {
    label: string;
    value?: any;
    type: string;
    key: string;
    disabled?: boolean;
};

// Text Input Field Component
const TextField = ({field}: { field: DynamicFormFieldType }) => (
    <div className="w-full mb-4">
        <label htmlFor={field.key} className="block mb-1 text-gray-700 text-sm font-medium">
            {field.label}
        </label>
        <input
            custom-attribute="df"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={field.value}
            type="text"
            disabled={field.disabled}
            id={field.key}
            name={field.key}
            placeholder={field.label}
            required
        />
    </div>
);

// Textarea Field Component
const TextareaField = ({field}: { field: DynamicFormFieldType }) => (
    <div className="w-full mb-4">
        <label htmlFor={field.key} className="block mb-1 text-gray-700 text-sm font-medium">
            {field.label}
        </label>
        <textarea
            custom-attribute="df"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={field.value}
            id={field.key}
            disabled={field.disabled}
            name={field.key}
            placeholder={field.label}
            required
        />
    </div>
);

// Rich Text Field Component
const RichtextField = ({field}: { field: DynamicFormFieldType }) => (
    <div className="w-full mb-4">
        <label htmlFor={field.key} className="block mb-1 text-gray-700 text-sm font-medium">
            {field.label}
        </label>
        <script src="https://cdn.ckeditor.com/ckeditor5/41.2.1/classic/ckeditor.js"></script>
        <div
            datatype="richtext"
            id={field.key}
            className="border border-gray-300 rounded-md p-3 bg-white shadow-md"
            dangerouslySetInnerHTML={{__html: field.value}}
        />
        <script
            dangerouslySetInnerHTML={{
                __html: `
          ClassicEditor.create(document.querySelector('#${field.key}'))
            .then(editor => {
              window.editors = window.editors || {};
              window.editors[${field.key}.id] = editor;
            })
            .catch(error => console.error(error));
        `,
            }}
        />
    </div>
);

// Autocomplete Field Component
export interface AutocompleteFieldProps extends DynamicFormFieldType {
    apiEndpoint?: string;
    subtype?: string;
}

function AutocompleteField({apiEndpoint, subtype, ...field}: AutocompleteFieldProps) {
    return (
        <div className="w-full mb-4 relative">
            <label htmlFor={field.key} className="block mb-1 text-gray-700 text-sm font-medium">
                {field.label}
            </label>

            {/* Container for selected chips */}
            <div id={`${field.key}-chips`} className="flex flex-wrap mb-2"></div>

            <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                id={field.key}
                name={field.key}
                placeholder={field.label}
                required
            />

            {/* Loading indicator */}
            <div id={`${field.key}-loading`} className="text-sm text-gray-500 mt-1" style={{display: "none"}}>
                Loading...
            </div>

            {/* Suggestions list */}
            <ul
                id={`${field.key}-suggestions`}
                className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-md mt-1 max-h-60 overflow-y-auto"
            ></ul>

            {/* Script to register event listeners and handle autocomplete */}
            <script
                dangerouslySetInnerHTML={{
                    __html: `
            (function() {
              var input = document.getElementById('${field.key}');
              var suggestionList = document.getElementById('${field.key}-suggestions');
              var chipContainer = document.getElementById('${field.key}-chips');
              var loadingIndicator = document.getElementById('${field.key}-loading');
              var timer;

              input.addEventListener('input', function(e) {
                clearTimeout(timer);
                timer = window.setTimeout(function() {
                  var query = input.value;
                  if (!query) {
                    suggestionList.innerHTML = '';
                    return;
                  }
                  loadingIndicator.style.display = 'block';
                  var endpoint = '${apiEndpoint || `/api/next-blog/api/${subtype || ""}`}' + '?q=' + encodeURIComponent(query);
                  fetch(endpoint)
                    .then(function(response) { return response.json(); })
                    .then(function(data) {
                      loadingIndicator.style.display = 'none';
                      suggestionList.innerHTML = '';
                      if (Array.isArray(data)) {
                        data.forEach(function(suggestion) {
                          var li = document.createElement('li');
                          li.textContent = suggestion.name;
                          li.className = 'px-3 py-2 hover:bg-blue-100 cursor-pointer';
                          li.addEventListener('click', function() {
                            // Create a chip for the selected suggestion
                            var chip = document.createElement('div');
                            chip.className = 'flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-1 mr-2 mb-2';
                            
                            var span = document.createElement('span');
                            span.textContent = suggestion._id;
                            span.className = 'mr-1';
                            
                            var btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'text-blue-500 hover:text-blue-700 focus:outline-none';
                            btn.innerHTML = '&times;';
                            btn.addEventListener('click', function() {
                              chip.parentNode.removeChild(chip);
                            });
                            
                            chip.appendChild(span);
                            chip.appendChild(btn);
                            chipContainer.appendChild(chip);
                            
                            input.value = '';
                            suggestionList.innerHTML = '';
                          });
                          suggestionList.appendChild(li);
                        });
                      }
                    })
                    .catch(function(error) {
                      loadingIndicator.style.display = 'none';
                      console.error('Autocomplete error:', error);
                    });
                }, 300);
              });
            })();
          `,
                }}
            />
        </div>
    );
}


// Main FormField component that delegates to the above based on the field type.
const FormField = ({field}: { field: DynamicFormFieldType }) => {
    switch (field.type) {
        case "text":
            return <TextField field={field}/>;
        case "textarea":
            return <TextareaField field={field}/>;
        case "richtext":
            return <RichtextField field={field}/>;
        case "autocomplete":
            return <AutocompleteField subtype={"tags"} {...field}/>;
        default:
            return null;
    }
};


const DynamicForm = ({
                         id,
                         postTo,
                         fields,
                         submitLabel,
                         redirectTo,
                     }: {
    id: string;
    postTo: string;
    fields: DynamicFormFieldType[];
    submitLabel: string;
    redirectTo: string;
}) => (
    <>
        <form id={id} className="flex flex-col space-y-4">
            {fields.map((field, index) => (
                <FormField key={index} field={field}/>
            ))}
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition">
                {submitLabel}
            </button>
        </form>
        <script
            type="application/javascript"
            dangerouslySetInnerHTML={{
                __html: `
          document.getElementById('${id}').addEventListener('submit', function (event) {
            event.preventDefault();
            const formData = {};
            event.target.querySelectorAll('input, textarea').forEach(input => {
              if(input.attributes.getNamedItem("custom-attribute")?.value === "df") {
                formData[input.name] = input.name === 'tags' ? input.value.split(',') : input.value;
              }
            });
            event.target.querySelectorAll('div[datatype="richtext"]').forEach(div => {
              formData[div.id] = window.editors[div.id].getData();
            });
            fetch('${postTo}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
              window.location.replace('${redirectTo}');
            })
            .catch(error => console.error('Error:', error));
          });
        `,
            }}
        />
    </>
);

export default DynamicForm;
