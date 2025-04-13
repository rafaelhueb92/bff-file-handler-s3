PROJECT_NAME=$(grep 'project:' ./config.yaml | sed -E 's/project:[[:space:]]*["\x27]?([^"\x27]+)["\x27]?/\1/')

echo "ECR_REPOSITORY=$PROJECT_NAME" >> $GITHUB_ENV
echo "TF_VAR_project_name=$PROJECT_NAME" >> $GITHUB_ENV
 
echo "TF_VAR_app_user=${{ secrets.APP_USER }}" >> $GITHUB_ENV
echo "TF_VAR_app_password=${{ secrets.APP_PASSWORD }}" >> $GITHUB_ENV