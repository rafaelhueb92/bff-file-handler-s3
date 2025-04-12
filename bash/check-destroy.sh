DESTROY=$(yq '.destroy' destroy.yaml)
echo "Destroy flag: $DESTROY"
echo "DESTROY=$DESTROY" >> $GITHUB_ENV
echo "DESTROY=$DESTROY" >> $GITHUB_OUTPUT